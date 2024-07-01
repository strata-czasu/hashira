import type { ExtractContext } from "@hashira/core";
import { schema } from "@hashira/db";
import { and, eq, inArray, sql } from "@hashira/db/drizzle";
import type { base } from "../base";
import { GUILD_IDS, STRATA_CZASU_CURRENCY } from "../specializedConstants";
import {
  CurrencyNotFoundError,
  InsufficientBalanceError,
  SelfTransferError,
  WalletCreationError,
  WalletNotFoundError,
} from "./economyError";

type Context = ExtractContext<typeof base>;

const getDefaultWalletName = (guildId: string) => {
  if (GUILD_IDS.StrataCzasu === guildId) return STRATA_CZASU_CURRENCY.defaultWalletName;

  return "Wallet";
};

const createDefaultWallets = async (
  db: Context["db"],
  currencyId: number,
  guildId: string,
  userIds: string[],
) => {
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
  db: Context["db"];
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

    const [defaultWallet] = await createDefaultWallets(tx, currency.id, guildId, [
      userId,
    ]);

    if (!defaultWallet) throw new WalletCreationError([userId]);

    return defaultWallet;
  });
};

type GetCurrencyConditionOptions = { currencySymbol: string } | { currencyId: number };

type GetCurrencyOptions = {
  db: Context["db"];
  guildId: string;
} & GetCurrencyConditionOptions;

const getCurrency = async ({ db, guildId, ...options }: GetCurrencyOptions) => {
  const currencyCondition =
    "currencySymbol" in options
      ? eq(schema.currency.symbol, options.currencySymbol)
      : eq(schema.currency.id, options.currencyId);

  const currency = await db.query.currency.findFirst({
    where: and(eq(schema.currency.guildId, guildId), currencyCondition),
  });

  if (!currency) throw new CurrencyNotFoundError();

  return currency;
};

type GetWalletOptions = {
  db: Context["db"];
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

      const [wallet] = await createDefaultWallets(tx, currency.id, guildId, [userId]);
      if (!wallet) throw new WalletCreationError([userId]);

      return wallet;
    }

    return wallet;
  });
};

type GetDefaultWalletsOptions = {
  db: Context["db"];
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

    const createdDefaultWallets = await createDefaultWallets(
      tx,
      currency.id,
      guildId,
      missingWallets,
    );

    return [...wallets, ...createdDefaultWallets];
  });
};

type TransferBalanceOptions = {
  db: Context["db"];
  fromUserId: string;
  toUserId: string;
  guildId: string;
  amount: number;
  reason: string | null;
  fromWalletName?: string;
  toWalletName?: string;
} & GetCurrencyConditionOptions;

export const transferBalance = async ({
  db,
  fromUserId,
  toUserId,
  guildId,
  amount,
  reason,
  fromWalletName,
  toWalletName,
  ...currencyOptions
}: TransferBalanceOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db: tx, guildId, ...currencyOptions });

    const fromWallet = await getWallet({
      db,
      userId: fromUserId,
      guildId,
      walletName: fromWalletName,
      currencyId: currency.id,
    });

    const toWallet = await getWallet({
      db,
      userId: toUserId,
      guildId,
      walletName: toWalletName,
      currencyId: currency.id,
    });

    if (fromWallet.id === toWallet.id) throw new SelfTransferError();

    if (fromWallet.balance < amount) throw new InsufficientBalanceError();

    await tx
      .update(schema.wallet)
      .set({ balance: sql`${schema.wallet.balance} - ${amount}` })
      .where(eq(schema.wallet.id, fromWallet.id));

    await tx
      .update(schema.wallet)
      .set({ balance: sql`${schema.wallet.balance} + ${amount}` })
      .where(eq(schema.wallet.id, toWallet.id));

    await tx.insert(schema.transaction).values({
      fromUserId: fromUserId,
      toUserId: toUserId,
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount,
      reason,
      currencyId: currency.id,
    });
  });
};

type AddBalanceOptions = {
  db: Context["db"];
  fromUserId: string;
  toUserId: string;
  guildId: string;
  amount: number;
  reason: string | null;
  walletName?: string;
} & GetCurrencyConditionOptions;

export const addBalance = async ({
  db,
  fromUserId,
  toUserId,
  guildId,
  amount,
  reason,
  walletName,
  ...currencyOptions
}: AddBalanceOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db: tx, guildId, ...currencyOptions });

    const wallet = await getWallet({
      db,
      userId: toUserId,
      guildId,
      walletName,
      currencyId: currency.id,
    });

    await tx
      .update(schema.wallet)
      .set({ balance: sql`${schema.wallet.balance} + ${amount}` })
      .where(eq(schema.wallet.id, wallet.id));

    await tx.insert(schema.transaction).values({
      fromUserId,
      toUserId,
      toWalletId: wallet.id,
      amount,
      currencyId: currency.id,
      reason,
    });
  });
};

type AddBalancesOptions = {
  db: Context["db"];
  fromUserId: string;
  toUserIds: string[];
  guildId: string;
  amount: number;
  reason: string | null;
} & GetCurrencyConditionOptions;

export const addBalances = async ({
  db,
  fromUserId,
  toUserIds,
  guildId,
  amount,
  reason,
  ...currencyOptions
}: AddBalancesOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db: tx, guildId, ...currencyOptions });

    const wallets = await getDefaultWallets({
      db: tx,
      userIds: toUserIds,
      guildId,
      currencyId: currency.id,
    });

    await Promise.all(
      wallets.map(async (wallet) => {
        await tx
          .update(schema.wallet)
          .set({ balance: sql`${schema.wallet.balance} + ${amount}` })
          .where(eq(schema.wallet.id, wallet.id));

        await tx.insert(schema.transaction).values({
          fromUserId,
          toUserId: wallet.userId,
          toWalletId: wallet.id,
          amount,
          currencyId: currency.id,
          reason,
        });
      }),
    );
  });
};

type TransferBalancesOptions = {
  db: Context["db"];
  fromUserId: string;
  toUserIds: string[];
  guildId: string;
  amount: number;
  reason: string | null;
} & GetCurrencyConditionOptions;

export const transferBalances = async ({
  db,
  fromUserId,
  toUserIds,
  guildId,
  amount,
  reason,
  ...currencyOptions
}: TransferBalancesOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await getCurrency({ db: tx, guildId, ...currencyOptions });

    const fromWallet = await getDefaultWallet({
      db: tx,
      userId: fromUserId,
      guildId,
      currencySymbol: currency.symbol,
    });

    const uniqueToUserIds = [...new Set(toUserIds)];

    const sum = uniqueToUserIds.length * amount;

    if (fromWallet.balance < sum) throw new InsufficientBalanceError();

    const wallets = await getDefaultWallets({
      db: tx,
      userIds: uniqueToUserIds,
      guildId,
      currencyId: currency.id,
    });

    await tx
      .update(schema.wallet)
      .set({ balance: sql`${schema.wallet.balance} - ${sum}` })
      .where(eq(schema.wallet.id, fromWallet.id));

    await Promise.all(
      wallets.map(async (wallet) => {
        await tx
          .update(schema.wallet)
          .set({ balance: sql`${schema.wallet.balance} + ${amount}` })
          .where(eq(schema.wallet.id, wallet.id));

        await tx.insert(schema.transaction).values({
          fromUserId,
          toUserId: wallet.userId,
          fromWalletId: fromWallet.id,
          toWalletId: wallet.id,
          amount,
          currencyId: currency.id,
          reason,
        });
      }),
    );
  });
};
