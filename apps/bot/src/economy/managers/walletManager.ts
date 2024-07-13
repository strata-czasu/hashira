import { type db, schema } from "@hashira/db";
import { and, eq, inArray } from "@hashira/db/drizzle";
import { GUILD_IDS, STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { WalletCreationError, WalletNotFoundError } from "../economyError";
import type { GetCurrencyConditionOptions } from "../util";
import { getCurrency } from "./currencyManager";

const getDefaultWalletName = (guildId: string) => {
  if (GUILD_IDS.StrataCzasu === guildId) return STRATA_CZASU_CURRENCY.defaultWalletName;

  return "Wallet";
};

type CreateDefaultWalletsOptions = {
  db: typeof db;
  currencyId: number;
  guildId: string;
  userIds: string[];
};

const createDefaultWallets = async ({
  db,
  currencyId,
  guildId,
  userIds,
}: CreateDefaultWalletsOptions) => {
  const values = userIds.map((userId) => ({
    name: getDefaultWalletName(guildId),
    userId,
    guildId,
    currencyId,
    default: true,
  }));

  const wallets = await db.insert(schema.wallet).values(values).returning();

  const usersWithoutWallets = userIds.filter(
    (userId) => !wallets.some((wallet) => wallet.userId === userId),
  );

  if (wallets.length !== userIds.length)
    throw new WalletCreationError(usersWithoutWallets);

  return wallets;
};

type GetDefaultWalletOptions = {
  db: typeof db;
  userId: string;
  guildId: string;
} & GetCurrencyConditionOptions;

export const getDefaultWallet = async ({
  db,
  userId,
  guildId,
  ...currencyOptions
}: GetDefaultWalletOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db, guildId, ...currencyOptions });

    const wallet = await tx.query.wallet.findFirst({
      where: and(
        eq(schema.wallet.userId, userId),
        eq(schema.wallet.guildId, guildId),
        eq(schema.wallet.default, true),
        eq(schema.wallet.currencyId, currency.id),
      ),
    });

    if (wallet) return wallet;

    const [defaultWallet] = await createDefaultWallets({
      db: tx,
      currencyId: currency.id,
      guildId,
      userIds: [userId],
    });

    if (!defaultWallet) throw new WalletCreationError([userId]);

    return defaultWallet;
  });
};

type GetWalletOptions = {
  db: typeof db;
  userId: string;
  guildId: string;
  walletName?: string | undefined;
} & GetCurrencyConditionOptions;

export const getWallet = async ({
  db,
  userId,
  guildId,
  walletName,
  ...currencyOptions
}: GetWalletOptions): Promise<typeof schema.wallet.$inferSelect> => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db: tx, guildId, ...currencyOptions });

    const walletCondition = walletName
      ? eq(schema.wallet.name, walletName)
      : eq(schema.wallet.default, true);

    const wallet = await tx.query.wallet.findFirst({
      where: and(
        eq(schema.wallet.userId, userId),
        eq(schema.wallet.guildId, guildId),
        eq(schema.wallet.currencyId, currency.id),
        walletCondition,
      ),
    });

    if (!wallet) {
      if (walletName) throw new WalletNotFoundError(walletName);

      const [wallet] = await createDefaultWallets({
        db: tx,
        currencyId: currency.id,
        guildId,
        userIds: [userId],
      });
      if (!wallet) throw new WalletCreationError([userId]);

      return wallet;
    }

    return wallet;
  });
};

type GetDefaultWalletsOptions = {
  db: typeof db;
  userIds: string[];
  guildId: string;
} & GetCurrencyConditionOptions;

export const getDefaultWallets = async ({
  db,
  userIds,
  guildId,
  ...currencyOptions
}: GetDefaultWalletsOptions): Promise<(typeof schema.wallet.$inferSelect)[]> => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db: tx, guildId, ...currencyOptions });

    const wallets = await tx.query.wallet.findMany({
      where: and(
        inArray(schema.wallet.userId, userIds),
        eq(schema.wallet.guildId, guildId),
        eq(schema.wallet.currencyId, currency.id),
        eq(schema.wallet.default, true),
      ),
    });

    const missingWallets = userIds.filter(
      (userId) => !wallets.some((wallet) => wallet.userId === userId),
    );

    const createdDefaultWallets = await createDefaultWallets({
      db: tx,
      currencyId: currency.id,
      guildId,
      userIds: missingWallets,
    });

    return [...wallets, ...createdDefaultWallets];
  });
};
