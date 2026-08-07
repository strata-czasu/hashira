import type {
  Birthday2026FeedBatch,
  Birthday2026TeamWallet,
  ExtendedPrismaClient,
  PrismaTransaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { addSeconds } from "date-fns";
import { InsufficientBalanceError } from "../../economy/economyError";
import { addBalance } from "../../economy/managers/transferManager";
import { debitWallet, getDefaultWallet } from "../../economy/managers/walletManager";
import { claimBirthday2026Config } from "./configService";
import { getBirthday2026EventState } from "./eventState";

export type Birthday2026EconomyErrorReason =
  | "config_not_found"
  | "currency_conflict"
  | "economy_not_configured"
  | "economy_already_configured"
  | "event_settled"
  | "event_not_open"
  | "invalid_currency"
  | "invalid_digestion_delay"
  | "insufficient_balance"
  | "member_not_found"
  | "cross_feed_already_used"
  | "target_team_not_found"
  | "team_wallet_not_found";

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
    if (!input.currencyName || !input.currencySymbol) {
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
        configuredEconomy.currency.name !== input.currencyName ||
        configuredEconomy.currency.symbol !== input.currencySymbol ||
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
        OR: [{ name: input.currencyName }, { symbol: input.currencySymbol }],
      },
    });
    const matchingCurrency = currencies.find(
      (currency) =>
        currency.name === input.currencyName &&
        currency.symbol === input.currencySymbol,
    );
    if (currencies.length > 0 && !matchingCurrency) {
      return { ok: false, reason: "currency_conflict" };
    }

    const currency =
      matchingCurrency ??
      (await tx.currency.create({
        data: {
          guildId: input.guildId,
          name: input.currencyName,
          symbol: input.currencySymbol,
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
    sourceKey: input.sourceKey,
  });
  if (existing) return { ok: true, created: false, ...existing };

  const membership = await prisma.birthday2026MemberState.findUnique({
    where: { configId_userId: { configId: config.id, userId: input.userId } },
    select: { id: true },
  });
  if (!membership) return { ok: false, reason: "member_not_found" };

  return prisma.$transaction(async (tx) => {
    const state = await claimBirthday2026Config(tx, config.id);
    if (state.settlement) return { ok: false, reason: "event_settled" };

    const { transaction, wallet } = await addBalance({
      prisma: nestedTransaction(tx),
      fromUserId: input.createdByUserId,
      toUserId: input.userId,
      guildId: input.guildId,
      amount: input.amount,
      reason: input.reason,
      currencyId,
    });

    await tx.birthday2026PersonalTransaction.create({
      data: {
        configId: config.id,
        userId: input.userId,
        transactionId: transaction.id,
        source: "staffGrant",
        sourceKey: input.sourceKey,
        createdByUserId: input.createdByUserId,
      },
    });

    return {
      ok: true,
      created: true,
      amount: input.amount,
      userId: input.userId,
      walletId: wallet.id,
      walletBalance: wallet.balance,
      transactionId: transaction.id,
    };
  });
};

export type ScheduleBirthday2026Digestion = (
  tx: PrismaTransaction,
  batch: Pick<Birthday2026FeedBatch, "digestAt" | "id">,
) => Promise<void>;

export type FeedBirthday2026PigInput = {
  guildId: string;
  userId: string;
  amount: number;
  sourceKey: string;
  acceptedAt: Date;
  reason: string;
  scheduleDigestion: ScheduleBirthday2026Digestion;
  targetTeamConfigId: number;
};

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

const resolveBirthday2026FeedTarget = async (
  tx: PrismaTransaction,
  input: {
    configId: number;
    currencyId: number;
    ownTeamId: number;
    ownWallet: Birthday2026TeamWallet | null;
    targetTeamConfigId: number;
    userId: string;
  },
) => {
  const { configId, currencyId, ownTeamId, ownWallet, targetTeamConfigId, userId } =
    input;

  if (targetTeamConfigId === ownTeamId) {
    if (!ownWallet || ownWallet.currencyId !== currencyId) {
      return { ok: false, reason: "team_wallet_not_found" } as const;
    }
    return { ok: true, teamConfigId: ownTeamId, walletId: ownWallet.id } as const;
  }

  const existingCrossFeed = await tx.birthday2026FeedBatch.findFirst({
    where: {
      configId,
      userId,
      wallet: { teamConfigId: { not: ownTeamId } },
    },
    select: { id: true },
  });
  if (existingCrossFeed) {
    return { ok: false, reason: "cross_feed_already_used" } as const;
  }

  const targetTeam = await tx.birthday2026TeamConfig.findFirst({
    where: { id: targetTeamConfigId, configId },
    include: { wallet: true },
  });
  if (!targetTeam?.wallet || targetTeam.wallet.currencyId !== currencyId) {
    return { ok: false, reason: "target_team_not_found" } as const;
  }
  return {
    ok: true,
    teamConfigId: targetTeam.id,
    walletId: targetTeam.wallet.id,
  } as const;
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
  input: FeedBirthday2026PigInput,
): Promise<FeedBirthday2026PigResult> => {
  const config = await prisma.birthday2026Config.findUnique({
    where: { guildId: input.guildId },
    include: {
      settlement: { select: { configId: true } },
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

  const duplicate = await findFeedResult(prisma, config.id, input.sourceKey);
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

  try {
    return await prisma.$transaction(async (tx) => {
      const state = await claimBirthday2026Config(tx, config.id);
      if (state.settlement) return { ok: false, reason: "event_settled" };
      if (!state.enabled) {
        return { ok: false, reason: "event_not_open" };
      }

      const target = await resolveBirthday2026FeedTarget(tx, {
        configId: config.id,
        userId: input.userId,
        currencyId,
        targetTeamConfigId: input.targetTeamConfigId,
        ownTeamId: membership.teamConfigId,
        ownWallet: membership.teamConfig.wallet,
      });
      if (!target.ok) return target;

      const wallet = await getDefaultWallet({
        prisma: nestedTransaction(tx),
        guildId: input.guildId,
        userId: input.userId,
        currencyId,
      });

      const personalTransaction = await debitWallet({
        prisma: tx,
        walletId: wallet.id,
        amount: input.amount,
        transaction: {
          reason: input.reason,
          transactionType: "transfer",
        },
      });

      await tx.birthday2026PersonalTransaction.create({
        data: {
          configId: config.id,
          userId: input.userId,
          transactionId: personalTransaction.id,
          source: "feed",
          sourceKey: input.sourceKey,
        },
      });

      const batch = await tx.birthday2026FeedBatch.create({
        data: {
          configId: config.id,
          walletId: target.walletId,
          userId: input.userId,
          personalTransactionId: personalTransaction.id,
          amount: input.amount,
          remainingAmount: input.amount,
          sourceKey: input.sourceKey,
          digestAt: addSeconds(input.acceptedAt, digestionDelaySeconds),
        },
      });
      const updatedTeamWallet = await tx.birthday2026TeamWallet.update({
        where: { id: target.walletId },
        data: { balance: { increment: input.amount } },
      });
      await tx.birthday2026TeamWalletTransaction.create({
        data: {
          walletId: target.walletId,
          feedBatchId: batch.id,
          personalTransactionId: personalTransaction.id,
          source: "feed",
          entryType: "credit",
          amount: input.amount,
          reason: input.reason,
          sourceKey: input.sourceKey,
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
        teamConfigId: target.teamConfigId,
      };
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return { ok: false, reason: "insufficient_balance" };
    }
    throw error;
  }
};

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
): Promise<DigestBirthday2026FeedBatchResult> =>
  prisma.$transaction(async (tx) => {
    let batch = await tx.birthday2026FeedBatch.findUnique({
      where: { id: input.batchId },
      include: { wallet: true },
    });
    if (!batch) return { ok: false, reason: "batch_not_found" };

    // Serialize against settlement and other event activity; the batch may
    // have changed while waiting for the claim, so read it again.
    await claimBirthday2026Config(tx, batch.configId);
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

    if (batch.wallet.balance < batch.remainingAmount) {
      return { ok: false, reason: "team_wallet_balance_mismatch" };
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

    const wallet = await tx.birthday2026TeamWallet.update({
      where: { id: batch.walletId },
      data: {
        balance: { decrement: batch.remainingAmount },
        permanentWeight: { increment: batch.remainingAmount },
      },
    });

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
    return {
      ok: true,
      digested: true,
      amount: batch.remainingAmount,
      permanentWeight: wallet.permanentWeight,
      teamBalance: wallet.balance,
      teamConfigId: wallet.teamConfigId,
    };
  });

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
