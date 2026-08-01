import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { isUniqueConstraintError } from "../../util/isUniqueConstraintError";
import { lockBirthday2026Config } from "./configService";

const getStoredBirthday2026Results = (prisma: PrismaTransaction, guildId: string) =>
  prisma.birthday2026Settlement.findFirst({
    where: { config: { guildId } },
    include: {
      teamResults: {
        include: { teamConfig: { include: { team: true } } },
        orderBy: { rank: "asc" },
      },
      individualResults: { orderBy: { userId: "asc" } },
    },
  });

export const getBirthday2026Results = getStoredBirthday2026Results;

class SettlementInvariantError extends Error {
  constructor(
    readonly reason:
      | "config_not_found"
      | "economy_not_configured"
      | "event_open"
      | "personal_wallet_balance_mismatch"
      | "team_wallet_balance_mismatch"
      | "teams_not_ready",
  ) {
    super(reason);
  }
}

export const settleBirthday2026Event = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    settledAt: Date;
    settledByUserId: string;
  },
) => {
  const existing = await getStoredBirthday2026Results(prisma, input.guildId);
  if (existing) return { ok: true, created: false, settlement: existing } as const;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const configRecord = await tx.birthday2026Config.findUnique({
        where: { guildId: input.guildId },
        select: { id: true },
      });
      if (!configRecord) throw new SettlementInvariantError("config_not_found");
      await lockBirthday2026Config(tx, configRecord.id);
      const config = await tx.birthday2026Config.findUnique({
        where: { guildId: input.guildId },
        include: {
          economy: true,
          settlement: true,
          teams: {
            include: {
              wallet: true,
              memberStates: { select: { userId: true } },
            },
          },
        },
      });
      if (!config) throw new SettlementInvariantError("config_not_found");
      if (!config.economy) {
        throw new SettlementInvariantError("economy_not_configured");
      }
      if (config.settlement) return false;
      if (config.enabled && input.settledAt < config.eventEndAt) {
        throw new SettlementInvariantError("event_open");
      }
      if (config.teams.length === 0 || config.teams.some((team) => !team.wallet)) {
        throw new SettlementInvariantError("teams_not_ready");
      }

      const pendingBatches = await tx.birthday2026FeedBatch.findMany({
        where: { configId: config.id, digestedAt: null },
        orderBy: { id: "asc" },
      });
      let digestedPendingPasza = 0;
      for (const batch of pendingBatches) {
        const claim = await tx.birthday2026FeedBatch.updateMany({
          where: { id: batch.id, digestedAt: null },
          data: { digestedAt: input.settledAt, remainingAmount: 0 },
        });
        if (claim.count === 0) continue;

        const wallet = await tx.birthday2026TeamWallet.updateMany({
          where: { id: batch.walletId, balance: { gte: batch.remainingAmount } },
          data: {
            balance: { decrement: batch.remainingAmount },
            permanentWeight: { increment: batch.remainingAmount },
          },
        });
        if (wallet.count === 0) {
          throw new SettlementInvariantError("team_wallet_balance_mismatch");
        }
        await tx.birthday2026TeamWalletTransaction.create({
          data: {
            walletId: batch.walletId,
            feedBatchId: batch.id,
            source: "digestion",
            entryType: "debit",
            amount: batch.remainingAmount,
            reason: "Birthday 2026 final settlement",
            sourceKey: batch.sourceKey,
          },
        });
        digestedPendingPasza += batch.remainingAmount;
      }

      if (pendingBatches.length > 0) {
        await tx.task.updateMany({
          where: {
            identifier: { in: pendingBatches.map((batch) => batch.id.toString()) },
            status: "pending",
            data: { path: ["type"], equals: "birthday2026Digest" },
          },
          data: { status: "cancelled" },
        });
      }

      const personalWallets = await tx.wallet.findMany({
        where: {
          balance: { gt: 0 },
          currencyId: config.economy.currencyId,
          default: true,
          guildId: input.guildId,
          userId: {
            in: config.teams.flatMap((team) =>
              team.memberStates.map((member) => member.userId),
            ),
          },
        },
        orderBy: { id: "asc" },
      });
      const discardedPersonalPasza = personalWallets.reduce(
        (total, wallet) => total + wallet.balance,
        0,
      );

      const [teamContributions, contributorRows, userContributions, teams] =
        await Promise.all([
          tx.birthday2026FeedBatch.groupBy({
            by: ["walletId"],
            where: { configId: config.id },
            _sum: { amount: true },
          }),
          tx.birthday2026FeedBatch.findMany({
            where: { configId: config.id },
            distinct: ["walletId", "userId"],
            select: { userId: true, walletId: true },
          }),
          tx.birthday2026FeedBatch.groupBy({
            by: ["userId"],
            where: { configId: config.id },
            _sum: { amount: true },
          }),
          tx.birthday2026TeamConfig.findMany({
            where: { configId: config.id },
            include: { wallet: true },
          }),
        ]);
      const contributionByWallet = new Map(
        teamContributions.map((entry) => [entry.walletId, entry._sum.amount ?? 0]),
      );
      const contributorsByWallet = new Map<number, number>();
      for (const row of contributorRows) {
        contributorsByWallet.set(
          row.walletId,
          (contributorsByWallet.get(row.walletId) ?? 0) + 1,
        );
      }
      const rankedTeams = teams
        .map((team) => {
          if (!team.wallet) throw new SettlementInvariantError("teams_not_ready");
          return {
            teamConfigId: team.id,
            permanentWeight: team.wallet.permanentWeight,
            contributedPasza: contributionByWallet.get(team.wallet.id) ?? 0,
            contributorCount: contributorsByWallet.get(team.wallet.id) ?? 0,
          };
        })
        .sort(
          (a, b) =>
            b.permanentWeight - a.permanentWeight ||
            b.contributorCount - a.contributorCount ||
            a.teamConfigId - b.teamConfigId,
        );

      await tx.birthday2026Settlement.create({
        data: {
          configId: config.id,
          cutoffAt:
            input.settledAt < config.eventEndAt ? input.settledAt : config.eventEndAt,
          settledAt: input.settledAt,
          settledByUserId: input.settledByUserId,
          digestedPendingPasza,
          discardedPersonalPasza,
        },
      });
      await tx.birthday2026SettlementTeam.createMany({
        data: rankedTeams.map((team, index) => ({
          configId: config.id,
          rank: index + 1,
          ...team,
        })),
      });

      const topContribution = Math.max(
        0,
        ...userContributions.map((entry) => entry._sum.amount ?? 0),
      );
      if (topContribution > 0) {
        await tx.birthday2026IndividualResult.createMany({
          data: userContributions
            .filter((entry) => entry._sum.amount === topContribution)
            .map((entry) => ({
              configId: config.id,
              category: "topContributor" as const,
              userId: entry.userId,
              amount: topContribution,
            })),
        });
      }

      for (const wallet of personalWallets) {
        const debit = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: wallet.balance },
          data: { balance: 0 },
        });
        if (debit.count === 0) {
          throw new SettlementInvariantError("personal_wallet_balance_mismatch");
        }
        const transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            relatedUserId: input.settledByUserId,
            amount: wallet.balance,
            reason: "Birthday 2026: unused Pasza expired at settlement",
            transactionType: "add",
            entryType: "debit",
            createdAt: input.settledAt,
          },
        });
        await tx.birthday2026PersonalTransaction.create({
          data: {
            configId: config.id,
            userId: wallet.userId,
            transactionId: transaction.id,
            source: "settlement",
            sourceKey: `settlement:${config.id}:${wallet.userId}`,
            createdAt: input.settledAt,
          },
        });
      }

      await tx.birthday2026Config.update({
        where: { id: config.id },
        data: { enabled: false },
      });
      return true;
    });

    const settlement = await getStoredBirthday2026Results(prisma, input.guildId);
    if (!settlement) throw new Error("Birthday 2026 settlement was not persisted");
    return { ok: true, created, settlement } as const;
  } catch (error) {
    if (error instanceof SettlementInvariantError) {
      return { ok: false, reason: error.reason } as const;
    }
    if (!isUniqueConstraintError(error)) throw error;
  }

  const settlement = await getStoredBirthday2026Results(prisma, input.guildId);
  if (!settlement) throw new Error("Birthday 2026 settlement was not persisted");
  return { ok: true, created: false, settlement } as const;
};

export const getBirthday2026SettlementDiagnostics = async (
  prisma: PrismaTransaction,
  guildId: string,
  now: Date,
) => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    select: {
      id: true,
      settlement: { select: { settledAt: true } },
      feedBatches: {
        where: { digestedAt: null },
        select: { digestAt: true, id: true, remainingAmount: true },
      },
    },
  });
  if (!config) return null;

  const pendingTasks = await prisma.task.findMany({
    where: {
      identifier: {
        in: config.feedBatches.map((batch) => batch.id.toString()),
      },
      status: "pending",
      data: { path: ["type"], equals: "birthday2026Digest" },
    },
    select: { identifier: true },
  });
  const scheduledBatchIds = new Set(pendingTasks.map((task) => task.identifier));

  return {
    settledAt: config.settlement?.settledAt ?? null,
    pendingBatchCount: config.feedBatches.length,
    pendingPasza: config.feedBatches.reduce(
      (total, batch) => total + batch.remainingAmount,
      0,
    ),
    overdueBatchCount: config.feedBatches.filter((batch) => batch.digestAt <= now)
      .length,
    missingTaskCount: config.feedBatches.filter(
      (batch) => !scheduledBatchIds.has(batch.id.toString()),
    ).length,
  };
};
