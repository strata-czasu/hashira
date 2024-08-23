import type { ExtendedPrismaClient, Prisma, PrismaTransaction } from "@hashira/db";
import { GUILD_IDS, STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { WalletCreationError, WalletNotFoundError } from "../economyError";
import type { GetCurrencyConditionOptions } from "../util";
import { getCurrency } from "./currencyManager";

const getDefaultWalletName = (guildId: string) => {
  if (GUILD_IDS.StrataCzasu === guildId) return STRATA_CZASU_CURRENCY.defaultWalletName;

  return "Wallet";
};

type CreateDefaultWalletsOptions = {
  prisma: PrismaTransaction;
  currencyId: number;
  guildId: string;
  userIds: string[];
};

const createDefaultWallets = async ({
  prisma,
  currencyId,
  guildId,
  userIds,
}: CreateDefaultWalletsOptions) => {
  const values = userIds.map(
    (userId) =>
      ({
        name: getDefaultWalletName(guildId),
        userId,
        guildId,
        currencyId,
        default: true,
      }) satisfies Prisma.WalletCreateManyInput,
  );

  const returnedUserIds = await prisma.wallet.createManyAndReturn({ data: values });

  const usersWithoutWallets = userIds.filter(
    (userId) => !returnedUserIds.some((wallet) => wallet.userId === userId),
  );

  if (returnedUserIds.length !== userIds.length)
    throw new WalletCreationError(usersWithoutWallets);

  return returnedUserIds;
};

type CreateDefaultWalletOptions = {
  prisma: PrismaTransaction;
  currencyId: number;
  guildId: string;
  userId: string;
};

const createDefaultWallet = async ({
  prisma,
  currencyId,
  guildId,
  userId,
}: CreateDefaultWalletOptions) => {
  const walletName = getDefaultWalletName(guildId);

  return await prisma.wallet.create({
    data: {
      name: walletName,
      userId,
      guildId,
      currencyId,
      default: true,
    },
  });
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
    const currency = await getCurrency({ prisma: prisma, guildId, ...currencyOptions });

    const wallet = await tx.wallet.findFirst({
      where: {
        userId,
        guildId,
        default: true,
        currencyId: currency.id,
      },
    });

    if (wallet) return wallet;

    const [defaultWallet] = await createDefaultWallets({
      prisma: tx,
      currencyId: currency.id,
      guildId,
      userIds: [userId],
    });

    if (!defaultWallet) throw new WalletCreationError([userId]);

    return defaultWallet;
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
  return await prisma.$transaction(async (tx) => {
    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });
    const walletCondition = walletName ? { name: walletName } : { default: true };

    const wallet = await tx.wallet.findFirst({
      where: {
        userId,
        guildId,
        currencyId: currency.id,
        ...walletCondition,
      },
    });

    if (wallet) return wallet;

    if (walletName) throw new WalletNotFoundError(walletName);

    const defaultWallet = await createDefaultWallet({
      prisma: tx,
      currencyId: currency.id,
      guildId,
      userId: userId,
    });

    if (!defaultWallet) throw new WalletCreationError([userId]);

    return defaultWallet;
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
    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const wallets = await tx.wallet.findMany({
      where: {
        userId: { in: userIds },
        guildId,
        currencyId: currency.id,
        default: true,
      },
    });

    if (wallets.length === userIds.length) return wallets;

    const missingWallets = userIds.filter(
      (userId) => !wallets.some((wallet) => wallet.userId === userId),
    );

    if (missingWallets.length === 0) return wallets;

    const createdDefaultWallets = await createDefaultWallets({
      prisma: tx,
      currencyId: currency.id,
      guildId,
      userIds: missingWallets,
    });

    return [...wallets, ...createdDefaultWallets];
  });
};
