import { type db, schema } from "@hashira/db";
import { eq, sql } from "@hashira/db/drizzle";
import { InsufficientBalanceError, SelfTransferError } from "../economyError";
import type { GetCurrencyConditionOptions } from "../util";
import { getCurrency } from "./currencyManager";
import { getDefaultWallet, getDefaultWallets, getWallet } from "./walletManager";

type TransferBalanceOptions = {
  db: typeof db;
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
  db: typeof db;
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
  db: typeof db;
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
  db: typeof db;
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
