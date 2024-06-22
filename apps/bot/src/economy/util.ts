import type { ExtractContext } from "@hashira/core";
import { schema } from "@hashira/db";
import { and, eq, sql } from "@hashira/db/drizzle";
import type { base } from "../base";
import { GUILD_IDS, STRATA_CZASU_CURRENCY } from "../specializedConstants";

type Context = ExtractContext<typeof base>;

const getDefaultWalletName = (guildId: string) => {
  if (GUILD_IDS.StrataCzasu === guildId) return STRATA_CZASU_CURRENCY.defaultWalletName;

  return "Wallet";
};

const createDefaultWallet = async (
  tx: Context["db"],
  currencyId: number,
  userId: string,
  guildId: string,
) => {
  const [wallet] = await tx
    .insert(schema.wallet)
    .values({
      name: getDefaultWalletName(guildId),
      userId,
      guildId,
      currencyId,
      default: true,
    })
    .returning();

  if (!wallet) throw new Error("Failed to create wallet!");

  return wallet;
};

export const getDefaultWallet = async (
  db: Context["db"],
  userId: string,
  guildId: string,
  currencySymbol: string,
) => {
  return await db.transaction(async (tx) => {
    const currency = await tx.query.currency.findFirst({
      where: and(
        eq(schema.currency.guildId, guildId),
        eq(schema.currency.symbol, currencySymbol),
      ),
    });

    if (!currency) throw new Error("Currency not found!");

    const wallet = await tx.query.wallet.findFirst({
      where: and(
        eq(schema.wallet.userId, userId),
        eq(schema.wallet.guildId, guildId),
        eq(schema.wallet.default, true),
        eq(schema.wallet.currencyId, currency.id),
      ),
    });

    if (wallet) return wallet;

    return await createDefaultWallet(tx, currency.id, userId, guildId);
  });
};

type GetWalletOptions = {
  db: Context["db"];
  userId: string;
  guildId: string;
  walletName?: string | undefined;
} & ({ currencySymbol: string } | { currencyId: number });

export const getWallet = async (options: GetWalletOptions) => {
  const { db, userId, guildId, walletName } = options;

  return await db.transaction(async (tx) => {
    const currencyCondition =
      "currencySymbol" in options
        ? eq(schema.currency.symbol, options.currencySymbol)
        : eq(schema.currency.id, options.currencyId);

    const currency = await tx.query.currency.findFirst({
      where: and(eq(schema.currency.guildId, guildId), currencyCondition),
    });

    if (!currency) throw new Error("Currency not found!");

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

    if (!wallet && !walletName) {
      return await createDefaultWallet(tx, currency.id, userId, guildId);
    }

    return wallet;
  });
};

type TransferBalanceOptions = {
  db: Context["db"];
  fromUserId: string;
  toUserId: string;
  guildId: string;
  currencySymbol: string;
  amount: number;
  fromWalletName?: string;
  toWalletName?: string;
};

export const transferBalance = async ({
  db,
  fromUserId,
  toUserId,
  guildId,
  currencySymbol,
  amount,
  fromWalletName,
  toWalletName,
}: TransferBalanceOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await tx.query.currency.findFirst({
      where: and(
        eq(schema.currency.guildId, guildId),
        eq(schema.currency.symbol, currencySymbol),
      ),
    });

    if (!currency) throw new Error("Currency not found!");

    const fromWallet = await getWallet({
      db,
      userId: fromUserId,
      guildId,
      walletName: fromWalletName,
      currencyId: currency.id,
    });

    if (!fromWallet) throw new Error("From wallet not found!");

    const toWallet = await getWallet({
      db,
      userId: toUserId,
      guildId,
      walletName: toWalletName,
      currencyId: currency.id,
    });

    if (!toWallet) throw new Error("To wallet not found!");

    if (fromWallet.id === toWallet.id)
      throw new Error("Cannot transfer to the same wallet!");

    if (fromWallet.balance < amount) throw new Error("Insufficient balance!");

    await tx
      .update(schema.wallet)
      .set({
        balance: sql`${schema.wallet.balance} - ${amount}`,
      })
      .where(eq(schema.wallet.id, fromWallet.id));

    await tx
      .update(schema.wallet)
      .set({
        balance: sql`${schema.wallet.balance} + ${amount}`,
      })
      .where(eq(schema.wallet.id, toWallet.id));

    await tx.insert(schema.transaction).values({
      fromUserId: fromUserId,
      toUserId: toUserId,
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount,
      currencyId: currency.id,
    });
  });
};

type AddBalanceOptions = {
  db: Context["db"];
  fromUserId: string;
  toUserId: string;
  guildId: string;
  currencySymbol: string;
  amount: number;
  walletName?: string;
};

export const addBalance = async ({
  db,
  fromUserId,
  toUserId,
  guildId,
  currencySymbol,
  amount,
  walletName,
}: AddBalanceOptions) => {
  return await db.transaction(async (tx) => {
    const currency = await tx.query.currency.findFirst({
      where: and(
        eq(schema.currency.guildId, guildId),
        eq(schema.currency.symbol, currencySymbol),
      ),
    });

    if (!currency) throw new Error("Currency not found!");

    const wallet = await getWallet({
      db,
      userId: toUserId,
      guildId,
      walletName,
      currencyId: currency.id,
    });

    if (!wallet) throw new Error("Wallet not found!");

    await tx
      .update(schema.wallet)
      .set({
        balance: sql`${schema.wallet.balance} + ${amount}`,
      })
      .where(eq(schema.wallet.id, wallet.id));

    await tx.insert(schema.transaction).values({
      fromUserId,
      toUserId,
      toWalletId: wallet.id,
      amount,
      currencyId: currency.id,
    });
  });
};
