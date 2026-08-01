import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { subSeconds } from "date-fns";
import { lockBirthday2026Config } from "./configService";
import { getBirthday2026EventState } from "./eventState";

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;
const isNonnegativeInteger = (value: number) =>
  Number.isSafeInteger(value) && value >= 0;

export const configureBirthday2026Raids = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    chargesPerTeam: number;
    maxSteal: number;
    protectedFloor: number;
    cooldownSeconds: number;
    graceSeconds: number;
    perUserLossCap: number;
    repeatTargetCap: number;
  },
) => {
  if (
    !isPositiveInteger(input.chargesPerTeam) ||
    !isPositiveInteger(input.maxSteal) ||
    !isNonnegativeInteger(input.protectedFloor) ||
    !isNonnegativeInteger(input.cooldownSeconds) ||
    !isNonnegativeInteger(input.graceSeconds) ||
    !isPositiveInteger(input.perUserLossCap) ||
    !isPositiveInteger(input.repeatTargetCap)
  ) {
    return { ok: false, reason: "invalid_config" } as const;
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      select: { id: true },
    });
    if (!record) return { ok: false, reason: "config_not_found" } as const;
    const config = await lockBirthday2026Config(tx, record.id);
    if (config.settlement) return { ok: false, reason: "event_settled" } as const;
    if (
      await tx.birthday2026RaidAttempt.findFirst({ where: { configId: record.id } })
    ) {
      return { ok: false, reason: "raids_already_used" } as const;
    }

    const data = {
      chargesPerTeam: input.chargesPerTeam,
      maxSteal: input.maxSteal,
      protectedFloor: input.protectedFloor,
      cooldownSeconds: input.cooldownSeconds,
      graceSeconds: input.graceSeconds,
      perUserLossCap: input.perUserLossCap,
      repeatTargetCap: input.repeatTargetCap,
    };
    const raidConfig = await tx.birthday2026RaidConfig.upsert({
      where: { configId: record.id },
      create: { configId: record.id, ...data },
      update: data,
    });
    return { ok: true, config: raidConfig } as const;
  });
};

export const raidBirthday2026Team = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    captainUserId: string;
    targetRoleId: string;
    sourceKey: string;
    attemptedAt: Date;
  },
) => {
  const sourceKey = input.sourceKey.trim();
  if (!sourceKey) return { ok: false, reason: "invalid_source_key" } as const;

  return prisma.$transaction(async (tx) => {
    const record = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      select: { id: true },
    });
    if (!record) return { ok: false, reason: "config_not_found" } as const;
    await lockBirthday2026Config(tx, record.id);

    const previous = await tx.birthday2026RaidAttempt.findUnique({
      where: { configId_sourceKey: { configId: record.id, sourceKey } },
      include: { transfer: true },
    });
    if (previous) return { ok: true, created: false, attempt: previous } as const;

    const config = await tx.birthday2026Config.findUniqueOrThrow({
      where: { id: record.id },
      include: { raidConfig: true, settlement: true },
    });
    if (config.settlement) return { ok: false, reason: "event_settled" } as const;
    if (getBirthday2026EventState(config, input.attemptedAt) !== "open") {
      return { ok: false, reason: "event_not_open" } as const;
    }
    if (!config.raidConfig) {
      return { ok: false, reason: "raids_not_configured" } as const;
    }
    const raidConfig = config.raidConfig;

    const membership = await tx.birthday2026MemberState.findUnique({
      where: {
        configId_userId: { configId: config.id, userId: input.captainUserId },
      },
      include: { teamConfig: { include: { identity: true, wallet: true } } },
    });
    if (!membership) return { ok: false, reason: "member_not_found" } as const;
    if (membership.teamConfig.identity?.captainUserId !== input.captainUserId) {
      return { ok: false, reason: "captain_required" } as const;
    }
    if (!membership.teamConfig.wallet) {
      return { ok: false, reason: "economy_not_configured" } as const;
    }
    const attackerWallet = membership.teamConfig.wallet;

    const target = await tx.birthday2026TeamConfig.findFirst({
      where: { configId: config.id, roleId: input.targetRoleId },
      include: { wallet: true },
    });
    if (!target) return { ok: false, reason: "target_not_found" } as const;
    if (target.id === membership.teamConfigId) {
      return { ok: false, reason: "own_team" } as const;
    }
    if (!target.wallet) return { ok: false, reason: "economy_not_configured" } as const;
    const targetWallet = target.wallet;

    const attemptsUsed = await tx.birthday2026RaidAttempt.count({
      where: { attackerTeamConfigId: membership.teamConfigId },
    });
    if (attemptsUsed >= raidConfig.chargesPerTeam) {
      return { ok: false, reason: "no_charges" } as const;
    }
    const lastAttempt = await tx.birthday2026RaidAttempt.findFirst({
      where: { attackerTeamConfigId: membership.teamConfigId },
      orderBy: { attemptedAt: "desc" },
      select: { attemptedAt: true },
    });
    if (
      lastAttempt &&
      input.attemptedAt.getTime() - lastAttempt.attemptedAt.getTime() <
        raidConfig.cooldownSeconds * 1000
    ) {
      return { ok: false, reason: "cooldown" } as const;
    }

    const candidates = await tx.birthday2026FeedBatch.findMany({
      where: {
        configId: config.id,
        walletId: targetWallet.id,
        digestedAt: null,
        remainingAmount: { gt: 0, lte: raidConfig.maxSteal },
        createdAt: {
          lte: subSeconds(input.attemptedAt, raidConfig.graceSeconds),
        },
      },
      orderBy: [{ remainingAmount: "asc" }, { id: "asc" }],
    });
    const victimUserIds = [...new Set(candidates.map((batch) => batch.userId))];
    const [losses, targetCounts] = victimUserIds.length
      ? await Promise.all([
          tx.birthday2026RaidTransfer.groupBy({
            by: ["victimUserId"],
            where: {
              victimUserId: { in: victimUserIds },
              attempt: { configId: config.id },
            },
            _sum: { amount: true },
          }),
          tx.birthday2026RaidTransfer.groupBy({
            by: ["victimUserId"],
            where: {
              victimUserId: { in: victimUserIds },
              attempt: {
                configId: config.id,
                attackerTeamConfigId: membership.teamConfigId,
              },
            },
            _count: true,
          }),
        ])
      : [[], []];
    const lossByUser = new Map(
      losses.map((loss) => [loss.victimUserId, loss._sum.amount ?? 0]),
    );
    const targetsByUser = new Map(
      targetCounts.map((targetCount) => [targetCount.victimUserId, targetCount._count]),
    );
    const batch = candidates.find(
      (candidate) =>
        targetWallet.balance - candidate.remainingAmount >= raidConfig.protectedFloor &&
        (lossByUser.get(candidate.userId) ?? 0) + candidate.remainingAmount <=
          raidConfig.perUserLossCap &&
        (targetsByUser.get(candidate.userId) ?? 0) < raidConfig.repeatTargetCap,
    );

    const attempt = await tx.birthday2026RaidAttempt.create({
      data: {
        configId: config.id,
        attackerTeamConfigId: membership.teamConfigId,
        targetTeamConfigId: target.id,
        captainUserId: input.captainUserId,
        sourceKey,
        outcome: batch ? "success" : "noEligibleBatch",
        attemptedAt: input.attemptedAt,
      },
    });
    if (!batch) {
      return {
        ok: true,
        created: true,
        attempt: { ...attempt, transfer: null },
      } as const;
    }

    const claimed = await tx.birthday2026FeedBatch.updateMany({
      where: {
        id: batch.id,
        walletId: targetWallet.id,
        digestedAt: null,
        remainingAmount: batch.remainingAmount,
      },
      data: { walletId: attackerWallet.id },
    });
    const debited = await tx.birthday2026TeamWallet.updateMany({
      where: { id: targetWallet.id, balance: { gte: batch.remainingAmount } },
      data: { balance: { decrement: batch.remainingAmount } },
    });
    if (claimed.count === 0 || debited.count === 0) {
      throw new Error("Birthday 2026 raid source changed while locked");
    }
    await tx.birthday2026TeamWallet.update({
      where: { id: attackerWallet.id },
      data: { balance: { increment: batch.remainingAmount } },
    });
    await tx.birthday2026TeamWalletTransaction.createMany({
      data: [
        {
          walletId: targetWallet.id,
          feedBatchId: batch.id,
          source: "raid",
          entryType: "debit",
          amount: batch.remainingAmount,
          reason: "Birthday 2026 raid loss",
          sourceKey: `${attempt.id}:out`,
        },
        {
          walletId: attackerWallet.id,
          feedBatchId: batch.id,
          source: "raid",
          entryType: "credit",
          amount: batch.remainingAmount,
          reason: "Birthday 2026 raid gain",
          sourceKey: `${attempt.id}:in`,
        },
      ],
    });
    const transfer = await tx.birthday2026RaidTransfer.create({
      data: {
        attemptId: attempt.id,
        sourceWalletId: targetWallet.id,
        destinationWalletId: attackerWallet.id,
        feedBatchId: batch.id,
        victimUserId: batch.userId,
        amount: batch.remainingAmount,
      },
    });
    return { ok: true, created: true, attempt: { ...attempt, transfer } } as const;
  });
};

export const getBirthday2026RaidStatus = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
) => {
  const membership = await prisma.birthday2026MemberState.findFirst({
    where: { userId, teamConfig: { config: { guildId } } },
    select: {
      teamConfigId: true,
      teamConfig: {
        select: {
          roleId: true,
          config: { select: { raidConfig: true } },
        },
      },
    },
  });
  if (!membership) return null;
  if (!membership.teamConfig.config.raidConfig) {
    throw new Error("Birthday 2026 raids are not configured");
  }
  const where = { attackerTeamConfigId: membership.teamConfigId };
  const [attemptCount, attempts] = await Promise.all([
    prisma.birthday2026RaidAttempt.count({ where }),
    prisma.birthday2026RaidAttempt.findMany({
      where,
      include: { targetTeam: { select: { roleId: true } }, transfer: true },
      orderBy: { attemptedAt: "desc" },
      take: 10,
    }),
  ]);
  return {
    ...membership,
    teamConfig: {
      ...membership.teamConfig,
      config: {
        raidConfig: membership.teamConfig.config.raidConfig,
      },
    },
    attemptCount,
    attempts,
  };
};

export const getBirthday2026RaidAudit = (prisma: PrismaTransaction, guildId: string) =>
  prisma.birthday2026RaidAttempt.findMany({
    where: { config: { guildId } },
    include: {
      attackerTeam: { select: { roleId: true } },
      targetTeam: { select: { roleId: true } },
      transfer: true,
    },
    orderBy: { attemptedAt: "desc" },
    take: 20,
  });
