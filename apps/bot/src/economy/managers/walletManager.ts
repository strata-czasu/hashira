import type { ExtendedPrismaClient, Prisma, PrismaTransaction } from "@hashira/db";
import { GUILD_IDS, STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import {
  InsufficientBalanceError,
  WalletCreationError,
  WalletNotFoundError,
} from "../economyError";
import { type GetCurrencyConditionOptions, validateNonNegativeAmount } from "../util";
import { getCurrency } from "./currencyManager";

const getDefaultWalletName = (guildId: string) => {
  if (GUILD_IDS.StrataCzasu === guildId) return STRATA_CZASU_CURRENCY.defaultWalletName;

  return "Wallet";
};

type DebitTransaction = {
  relatedUserId?: string | null;
  relatedWalletId?: number | null;
  reason: string | null;
  transactionType: "add" | "transfer";
};

type DebitWalletOptions = {
  prisma: PrismaTransaction;
  walletId: number;
  amount: number;
  transaction: DebitTransaction;
};

/**
 * Decrement a wallet only when it has enough balance and record the matching debit.
 * The caller owns the transaction so a later failure rolls both writes back.
 */
export const debitWallet = async ({
  prisma,
  walletId,
  amount,
  transaction,
}: DebitWalletOptions): Promise<void> => {
  validateNonNegativeAmount(amount);

  const result = await prisma.wallet.updateMany({
    where: {
      id: walletId,
      balance: { gte: amount },
    },
    data: {
      balance: { decrement: amount },
    },
  });

  if (result.count === 0) throw new InsufficientBalanceError();

  await prisma.transaction.create({
    data: {
      walletId,
      amount,
      entryType: "debit",
      ...transaction,
    },
  });
};

type GetReceivedTransfersOptions = {
  prisma: ExtendedPrismaClient;
  userId: string;
  guildId: string;
} & GetCurrencyConditionOptions;

/**
 * Get the total amount of currency received by a user via transfers.
 * Uses the Transaction table - looks for credit entries with transfer type
 * on the user's wallet for the specified currency.
 */
export const getReceivedTransfers = async ({
  prisma,
  userId,
  guildId,
  ...currencyOptions
}: GetReceivedTransfersOptions): Promise<number> => {
  const wallet = await getDefaultWallet({
    prisma,
    userId,
    guildId,
    ...currencyOptions,
  });

  const result = await prisma.transaction.aggregate({
    where: {
      walletId: wallet.id,
      entryType: "credit",
      transactionType: "transfer",
    },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
};

type GetDefaultWalletOptions = {
  prisma: ExtendedPrismaClient;
  userId: string;
  guildId: string;
} & GetCurrencyConditionOptions;

export const getDefaultWallet = async ({
  prisma,
  userId,
  guildId,
  ...currencyOptions
}: GetDefaultWalletOptions) => {
  return await prisma.$transaction(async (tx) => {
    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const wallet = await tx.wallet.findFirst({
      where: {
        userId,
        guildId,
        default: true,
        currencyId: currency.id,
      },
    });

    if (wallet) return wallet;

    const name = getDefaultWalletName(guildId);
    return await tx.wallet.upsert({
      where: {
        userId_name_guildId_currencyId: {
          userId,
          name,
          guildId,
          currencyId: currency.id,
        },
      },
      create: {
        name,
        userId,
        guildId,
        currencyId: currency.id,
        default: true,
      },
      update: { default: true },
    });
  });
};

type GetWalletOptions = {
  prisma: ExtendedPrismaClient;
  userId: string;
  guildId: string;
  walletName?: string | undefined;
} & GetCurrencyConditionOptions;

export const getWallet = async ({
  prisma,
  userId,
  guildId,
  walletName,
  ...currencyOptions
}: GetWalletOptions) => {
  if (!walletName) {
    return await getDefaultWallet({
      prisma,
      userId,
      guildId,
      ...currencyOptions,
    });
  }

  return await prisma.$transaction(async (tx) => {
    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });
    const wallet = await tx.wallet.findUnique({
      where: {
        userId_name_guildId_currencyId: {
          userId,
          name: walletName,
          guildId,
          currencyId: currency.id,
        },
      },
    });

    if (wallet) return wallet;

    throw new WalletNotFoundError(walletName);
  });
};

type GetDefaultWalletsOptions = {
  prisma: ExtendedPrismaClient;
  userIds: string[];
  guildId: string;
} & GetCurrencyConditionOptions;

export const getDefaultWallets = async ({
  prisma,
  userIds,
  guildId,
  ...currencyOptions
}: GetDefaultWalletsOptions) => {
  return await prisma.$transaction(async (tx) => {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return [];

    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const wallets = await tx.wallet.findMany({
      where: {
        userId: { in: uniqueUserIds },
        guildId,
        currencyId: currency.id,
        default: true,
      },
    });
    const walletsByUserId = new Map(wallets.map((wallet) => [wallet.userId, wallet]));

    const missingUserIds = uniqueUserIds.filter(
      (userId) => !walletsByUserId.has(userId),
    );

    if (missingUserIds.length > 0) {
      const name = getDefaultWalletName(guildId);
      const values = missingUserIds.map(
        (userId) =>
          ({
            name,
            userId,
            guildId,
            currencyId: currency.id,
            default: true,
          }) satisfies Prisma.WalletCreateManyInput,
      );
      await tx.wallet.createMany({ data: values, skipDuplicates: true });

      const createdWallets = await tx.wallet.findMany({
        where: {
          userId: { in: missingUserIds },
          guildId,
          currencyId: currency.id,
          default: true,
        },
      });
      for (const wallet of createdWallets) walletsByUserId.set(wallet.userId, wallet);
    }

    const usersWithoutWallets = uniqueUserIds.filter(
      (userId) => !walletsByUserId.has(userId),
    );
    if (usersWithoutWallets.length > 0) {
      throw new WalletCreationError(usersWithoutWallets);
    }

    return uniqueUserIds.map((userId) => {
      const wallet = walletsByUserId.get(userId);
      if (!wallet) throw new WalletCreationError([userId]);
      return wallet;
    });
  });
};
