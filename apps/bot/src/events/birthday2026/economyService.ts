import type {
  Birthday2026FeedBatch,
  ExtendedPrismaClient,
  PrismaTransaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { addSeconds } from "date-fns";
import { getDefaultWallet } from "../../economy/managers/walletManager";
import { isUniqueConstraintError } from "../../util/isUniqueConstraintError";
import { lockBirthday2026Config } from "./configService";
import { getBirthday2026EventState } from "./eventState";

export type Birthday2026EconomyErrorReason =
  | "config_not_found"
  | "currency_conflict"
  | "economy_not_configured"
  | "economy_already_configured"
  | "event_settled"
  | "event_not_open"
  | "invalid_amount"
  | "invalid_currency"
  | "invalid_digestion_delay"
  | "invalid_source_key"
  | "insufficient_balance"
  | "member_not_found"
  | "team_wallet_not_found";

const isPositiveAmount = (amount: number) => Number.isSafeInteger(amount) && amount > 0;

const normalizeSourceKey = (sourceKey: string) => {
  const normalized = sourceKey.trim();
  return normalized.length > 0 ? normalized : null;
};

export type SetupBirthday2026EconomyResult =
  | {
      ok: true;
      configId: number;
      currencyId: number;
      teamWalletCount: number;
    }
  | {
      ok: false;
      reason:
        | "config_not_found"
        | "currency_conflict"
        | "economy_already_configured"
        | "invalid_currency"
        | "invalid_digestion_delay";
    };

export const setupBirthday2026Economy = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    currencyName: string;
    currencySymbol: string;
    digestionDelaySeconds: number;
    createdByUserId: string;
  },
): Promise<SetupBirthday2026EconomyResult> =>
  prisma.$transaction(async (tx) => {
    const currencyName = input.currencyName.trim();
    const currencySymbol = input.currencySymbol.trim();
    if (!currencyName || !currencySymbol) {
      return { ok: false, reason: "invalid_currency" };
    }
    if (
      !Number.isSafeInteger(input.digestionDelaySeconds) ||
      input.digestionDelaySeconds < 0
    ) {
      return { ok: false, reason: "invalid_digestion_delay" };
    }

    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      include: {
        economy: { include: { currency: true } },
        teams: { select: { id: true, wallet: { select: { id: true } } } },
      },
    });
    if (!config) return { ok: false, reason: "config_not_found" };
    const configuredEconomy = config.economy;
    if (configuredEconomy) {
      if (
        configuredEconomy.currency.name !== currencyName ||
        configuredEconomy.currency.symbol !== currencySymbol ||
        configuredEconomy.digestionDelaySeconds !== input.digestionDelaySeconds
      ) {
        return { ok: false, reason: "economy_already_configured" };
      }

      const missingTeams = config.teams.filter((team) => !team.wallet);
      if (missingTeams.length > 0) {
        await tx.birthday2026TeamWallet.createMany({
          data: missingTeams.map((team) => ({
            teamConfigId: team.id,
            currencyId: configuredEconomy.currencyId,
            balance: 0,
            permanentWeight: 0,
          })),
        });
      }

      return {
        ok: true,
        configId: config.id,
        currencyId: configuredEconomy.currencyId,
        teamWalletCount: config.teams.length,
      };
    }

    const currencies = await tx.currency.findMany({
      where: {
        guildId: input.guildId,
        OR: [{ name: currencyName }, { symbol: currencySymbol }],
      },
    });
    const matchingCurrency = currencies.find(
      (currency) =>
        currency.name === currencyName && currency.symbol === currencySymbol,
    );
    if (currencies.length > 0 && !matchingCurrency) {
      return { ok: false, reason: "currency_conflict" };
    }

    const currency =
      matchingCurrency ??
      (await tx.currency.create({
        data: {
          guildId: input.guildId,
          name: currencyName,
          symbol: currencySymbol,
          createdBy: input.createdByUserId,
        },
      }));

    await tx.birthday2026EconomyConfig.create({
      data: {
        configId: config.id,
        currencyId: currency.id,
        digestionDelaySeconds: input.digestionDelaySeconds,
      },
    });
    await tx.birthday2026TeamWallet.createMany({
      data: config.teams.map((team) => ({
        teamConfigId: team.id,
        currencyId: currency.id,
        balance: 0,
        permanentWeight: 0,
      })),
    });

    return {
      ok: true,
      configId: config.id,
      currencyId: currency.id,
      teamWalletCount: config.teams.length,
    };
  });

const findPersonalTransaction = async (
  prisma: PrismaTransaction,
  input: {
    configId: number;
    source: "feed" | "staffGrant";
    sourceKey: string;
  },
) => {
  const reference = await prisma.birthday2026PersonalTransaction.findUnique({
    where: {
      configId_source_sourceKey: input,
    },
    include: {
      transaction: {
        include: { wallet: { select: { id: true, balance: true } } },
      },
    },
  });
  if (!reference) return null;

  return {
    amount: reference.transaction.amount,
    userId: reference.userId,
    walletId: reference.transaction.wallet.id,
    walletBalance: reference.transaction.wallet.balance,
    transactionId: reference.transactionId,
  };
};

export type GrantBirthday2026PaszaResult =
  | {
      ok: true;
      created: boolean;
      amount: number;
      userId: string;
      walletId: number;
      walletBalance: number;
      transactionId: number;
    }
  | { ok: false; reason: Birthday2026EconomyErrorReason };

export const grantBirthday2026Pasza = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    userId: string;
    amount: number;
    sourceKey: string;
    createdByUserId: string;
    reason: string;
  },
): Promise<GrantBirthday2026PaszaResult> => {
  if (!isPositiveAmount(input.amount)) {
    return { ok: false, reason: "invalid_amount" };
  }
  const sourceKey = normalizeSourceKey(input.sourceKey);
  if (!sourceKey) return { ok: false, reason: "invalid_source_key" };

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    select: {
      id: true,
      settlement: { select: { configId: true } },
      economy: { select: { currencyId: true } },
    },
  });
  if (!config) return { ok: false, reason: "config_not_found" };
  if (config.settlement) return { ok: false, reason: "event_settled" };
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" };
  }
  const currencyId = config.economy.currencyId;

  const existing = await findPersonalTransaction(prisma, {
    configId: config.id,
    source: "staffGrant",
    sourceKey,
  });
  if (existing) return { ok: true, created: false, ...existing };

  const membership = await prisma.birthday2026MemberState.findUnique({
    where: { configId_userId: { configId: config.id, userId: input.userId } },
    select: { id: true },
  });
  if (!membership) return { ok: false, reason: "member_not_found" };

  try {
    return await prisma.$transaction(async (tx) => {
      const state = await lockBirthday2026Config(tx, config.id);
      if (state.settlement) return { ok: false, reason: "event_settled" };
      const wallet = await getDefaultWallet({
        prisma: nestedTransaction(tx),
        guildId: input.guildId,
        userId: input.userId,
        currencyId,
      });
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: input.amount } },
      });
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          relatedUserId: input.createdByUserId,
          amount: input.amount,
          reason: input.reason,
          transactionType: "add",
          entryType: "credit",
        },
      });
      await tx.birthday2026PersonalTransaction.create({
        data: {
          configId: config.id,
          userId: input.userId,
          transactionId: transaction.id,
          source: "staffGrant",
          sourceKey,
          createdByUserId: input.createdByUserId,
        },
      });

      return {
        ok: true,
        created: true,
        amount: input.amount,
        userId: input.userId,
        walletId: wallet.id,
        walletBalance: updatedWallet.balance,
        transactionId: transaction.id,
      };
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const duplicate = await findPersonalTransaction(prisma, {
      configId: config.id,
      source: "staffGrant",
      sourceKey,
    });
    if (!duplicate) throw error;
    return { ok: true, created: false, ...duplicate };
  }
};

type ScheduleDigestion = (
  tx: PrismaTransaction,
  batch: Pick<Birthday2026FeedBatch, "digestAt" | "id">,
) => Promise<void>;

export type FeedBirthday2026PigResult =
  | {
      ok: true;
      created: boolean;
      batch: Birthday2026FeedBatch;
      personalBalance: number;
      teamBalance: number;
      teamConfigId: number;
    }
  | {
      ok: false;
      reason: Birthday2026EconomyErrorReason;
    };

const findFeedResult = async (
  prisma: PrismaTransaction,
  configId: number,
  sourceKey: string,
): Promise<Extract<FeedBirthday2026PigResult, { ok: true }> | null> => {
  const batch = await prisma.birthday2026FeedBatch.findUnique({
    where: { configId_sourceKey: { configId, sourceKey } },
    include: {
      wallet: { select: { balance: true, teamConfigId: true } },
      personalTransaction: {
        include: { wallet: { select: { balance: true } } },
      },
    },
  });
  if (!batch) return null;

  return {
    ok: true,
    created: false,
    batch,
    personalBalance: batch.personalTransaction.wallet.balance,
    teamBalance: batch.wallet.balance,
    teamConfigId: batch.wallet.teamConfigId,
  };
};

export const feedBirthday2026Pig = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    userId: string;
    amount: number;
    sourceKey: string;
    acceptedAt: Date;
    reason: string;
    scheduleDigestion: ScheduleDigestion;
  },
): Promise<FeedBirthday2026PigResult> => {
  if (!isPositiveAmount(input.amount)) {
    return { ok: false, reason: "invalid_amount" };
  }
  const sourceKey = normalizeSourceKey(input.sourceKey);
  if (!sourceKey) return { ok: false, reason: "invalid_source_key" };

  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    select: {
      id: true,
      enabled: true,
      eventEndAt: true,
      eventStartAt: true,
      settlement: { select: { configId: true } },
      visible: true,
      economy: {
        select: {
          currencyId: true,
          digestionDelaySeconds: true,
        },
      },
    },
  });
  if (!config) return { ok: false, reason: "config_not_found" };
  if (config.settlement) return { ok: false, reason: "event_settled" };
  if (getBirthday2026EventState(config, input.acceptedAt) !== "open") {
    return { ok: false, reason: "event_not_open" };
  }
  if (!config.economy) {
    return { ok: false, reason: "economy_not_configured" };
  }
  const { currencyId, digestionDelaySeconds } = config.economy;

  const duplicate = await findFeedResult(prisma, config.id, sourceKey);
  if (duplicate) return duplicate;

  const membership = await prisma.birthday2026MemberState.findUnique({
    where: { configId_userId: { configId: config.id, userId: input.userId } },
    include: {
      teamConfig: {
        include: { wallet: true },
      },
    },
  });
  if (!membership) return { ok: false, reason: "member_not_found" };
  const teamWallet = membership.teamConfig.wallet;
  if (!teamWallet || teamWallet.currencyId !== currencyId) {
    return { ok: false, reason: "team_wallet_not_found" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const state = await lockBirthday2026Config(tx, config.id);
      if (state.settlement) return { ok: false, reason: "event_settled" };
      if (!state.enabled) {
        return { ok: false, reason: "event_not_open" };
      }
      const [powerupConfig, activeTurbo] = await Promise.all([
        tx.birthday2026PowerupConfig.findUnique({
          where: { configId: config.id },
        }),
        tx.birthday2026PowerupActivation.findFirst({
          where: {
            teamConfigId: membership.teamConfigId,
            activatedAt: { lte: input.acceptedAt },
            expiresAt: { gt: input.acceptedAt },
          },
          select: { id: true },
        }),
      ]);
      const digestionSeconds =
        powerupConfig && activeTurbo
          ? Math.min(digestionDelaySeconds, powerupConfig.turboDigestionSeconds)
          : digestionDelaySeconds;
      const wallet = await getDefaultWallet({
        prisma: nestedTransaction(tx),
        guildId: input.guildId,
        userId: input.userId,
        currencyId,
      });
      const debit = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: input.amount } },
        data: { balance: { decrement: input.amount } },
      });
      if (debit.count === 0) {
        return { ok: false, reason: "insufficient_balance" };
      }

      const personalTransaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: input.amount,
          reason: input.reason,
          transactionType: "transfer",
          entryType: "debit",
        },
      });
      await tx.birthday2026PersonalTransaction.create({
        data: {
          configId: config.id,
          userId: input.userId,
          transactionId: personalTransaction.id,
          source: "feed",
          sourceKey,
        },
      });

      const batch = await tx.birthday2026FeedBatch.create({
        data: {
          configId: config.id,
          walletId: teamWallet.id,
          userId: input.userId,
          personalTransactionId: personalTransaction.id,
          amount: input.amount,
          remainingAmount: input.amount,
          sourceKey,
          digestAt: addSeconds(input.acceptedAt, digestionSeconds),
          createdAt: input.acceptedAt,
        },
      });
      const updatedTeamWallet = await tx.birthday2026TeamWallet.update({
        where: { id: teamWallet.id },
        data: { balance: { increment: input.amount } },
      });
      await tx.birthday2026TeamWalletTransaction.create({
        data: {
          walletId: teamWallet.id,
          feedBatchId: batch.id,
          personalTransactionId: personalTransaction.id,
          source: "feed",
          entryType: "credit",
          amount: input.amount,
          reason: input.reason,
          sourceKey,
        },
      });
      await input.scheduleDigestion(tx, batch);

      const updatedPersonalWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
        select: { balance: true },
      });
      return {
        ok: true,
        created: true,
        batch,
        personalBalance: updatedPersonalWallet.balance,
        teamBalance: updatedTeamWallet.balance,
        teamConfigId: membership.teamConfigId,
      };
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await findFeedResult(prisma, config.id, sourceKey);
    if (!existing) throw error;
    return existing;
  }
};

class TeamWalletInvariantError extends Error {}

export type DigestBirthday2026FeedBatchResult =
  | {
      ok: true;
      digested: boolean;
      amount: number;
      permanentWeight: number;
      teamBalance: number;
      teamConfigId: number;
    }
  | {
      ok: false;
      reason: "batch_not_found" | "not_due" | "team_wallet_balance_mismatch";
    };

export const digestBirthday2026FeedBatch = async (
  prisma: ExtendedPrismaClient,
  input: {
    batchId: number;
    processedAt: Date;
    reason: string;
  },
): Promise<DigestBirthday2026FeedBatchResult> => {
  try {
    return await prisma.$transaction(async (tx) => {
      let batch = await tx.birthday2026FeedBatch.findUnique({
        where: { id: input.batchId },
        include: { wallet: true },
      });
      if (!batch) return { ok: false, reason: "batch_not_found" };
      await lockBirthday2026Config(tx, batch.configId);
      batch = await tx.birthday2026FeedBatch.findUnique({
        where: { id: input.batchId },
        include: { wallet: true },
      });
      if (!batch) return { ok: false, reason: "batch_not_found" };
      if (batch.digestedAt) {
        return {
          ok: true,
          digested: false,
          amount: batch.amount,
          permanentWeight: batch.wallet.permanentWeight,
          teamBalance: batch.wallet.balance,
          teamConfigId: batch.wallet.teamConfigId,
        };
      }
      if (input.processedAt < batch.digestAt) {
        return { ok: false, reason: "not_due" };
      }

      const claim = await tx.birthday2026FeedBatch.updateMany({
        where: { id: batch.id, digestedAt: null },
        data: { digestedAt: input.processedAt, remainingAmount: 0 },
      });
      if (claim.count === 0) {
        const currentWallet = await tx.birthday2026TeamWallet.findUniqueOrThrow({
          where: { id: batch.walletId },
        });
        return {
          ok: true,
          digested: false,
          amount: batch.amount,
          permanentWeight: currentWallet.permanentWeight,
          teamBalance: currentWallet.balance,
          teamConfigId: currentWallet.teamConfigId,
        };
      }

      const walletUpdate = await tx.birthday2026TeamWallet.updateMany({
        where: {
          id: batch.walletId,
          balance: { gte: batch.remainingAmount },
        },
        data: {
          balance: { decrement: batch.remainingAmount },
          permanentWeight: { increment: batch.remainingAmount },
        },
      });
      if (walletUpdate.count === 0) throw new TeamWalletInvariantError();

      await tx.birthday2026TeamWalletTransaction.create({
        data: {
          walletId: batch.walletId,
          feedBatchId: batch.id,
          source: "digestion",
          entryType: "debit",
          amount: batch.remainingAmount,
          reason: input.reason,
          sourceKey: batch.sourceKey,
        },
      });
      const wallet = await tx.birthday2026TeamWallet.findUniqueOrThrow({
        where: { id: batch.walletId },
      });

      return {
        ok: true,
        digested: true,
        amount: batch.remainingAmount,
        permanentWeight: wallet.permanentWeight,
        teamBalance: wallet.balance,
        teamConfigId: wallet.teamConfigId,
      };
    });
  } catch (error) {
    if (error instanceof TeamWalletInvariantError) {
      return { ok: false, reason: "team_wallet_balance_mismatch" };
    }
    throw error;
  }
};

export type Birthday2026TeamEconomyStatus = {
  teamConfigId: number;
  teamName: string;
  balance: number | null;
  unresolvedFeed: number | null;
  permanentWeight: number | null;
  reconciled: boolean;
};

export const getBirthday2026EconomyStatus = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026TeamEconomyStatus[] | null> => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId },
    include: {
      economy: true,
      teams: {
        include: {
          team: true,
          wallet: {
            include: {
              feedBatches: {
                where: { digestedAt: null },
                select: { remainingAmount: true },
              },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!config?.economy) {
    return null;
  }

  return config.teams.map((team) => {
    if (!team.wallet) {
      return {
        teamConfigId: team.id,
        teamName: team.team.name,
        balance: null,
        unresolvedFeed: null,
        permanentWeight: null,
        reconciled: false,
      };
    }
    const unresolvedFeed = team.wallet.feedBatches.reduce(
      (sum, batch) => sum + batch.remainingAmount,
      0,
    );
    return {
      teamConfigId: team.id,
      teamName: team.team.name,
      balance: team.wallet.balance,
      unresolvedFeed,
      permanentWeight: team.wallet.permanentWeight,
      reconciled: team.wallet.balance === unresolvedFeed,
    };
  });
};
