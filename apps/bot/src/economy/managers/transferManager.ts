import type { ExtendedPrismaClient } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import {
  InsufficientBalanceError,
  InvalidAmountError,
  SelfTransferError,
} from "../economyError";
import type { GetCurrencyConditionOptions } from "../util";
import { getCurrency } from "./currencyManager";
import { getDefaultWallet, getDefaultWallets, getWallet } from "./walletManager";

type AddBalanceOptions = {
  prisma: ExtendedPrismaClient;
  fromUserId?: string | null;
  toUserId: string;
  guildId: string;
  amount: number;
  reason: string | null;
  walletName?: string;
} & GetCurrencyConditionOptions;

export const addBalance = async ({
  prisma,
  fromUserId = null,
  toUserId,
  guildId,
  amount,
  reason,
  walletName,
  ...currencyOptions
}: AddBalanceOptions) => {
  return await prisma.$transaction(async (tx) => {
    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const wallet = await getWallet({
      prisma,
      userId: toUserId,
      guildId,
      walletName,
      currencyId: currency.id,
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
        transactions: {
          create: {
            relatedUserId: fromUserId,
            amount,
            reason,
            entryType: amount > 0 ? "credit" : "debit",
            transactionType: "add",
          },
        },
      },
    });
  });
};

type AddBalancesOptions = {
  prisma: ExtendedPrismaClient;
  fromUserId?: string | null;
  toUserIds: string[];
  guildId: string;
  amount: number;
  reason: string | null;
} & GetCurrencyConditionOptions;

export const addBalances = async ({
  prisma,
  fromUserId = null,
  toUserIds,
  guildId,
  amount,
  reason,
  ...currencyOptions
}: AddBalancesOptions) => {
  return await prisma.$transaction(async (tx) => {
    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const wallets = await getDefaultWallets({
      prisma: nestedTransaction(tx),
      userIds: toUserIds,
      guildId,
      currencyId: currency.id,
    });

    const walletIds = wallets.map((wallet) => wallet.id);

    await tx.wallet.updateMany({
      data: { balance: { increment: amount } },
      where: { id: { in: walletIds } },
    });

    await tx.transaction.createMany({
      data: wallets.map((wallet) => ({
        walletId: wallet.id,
        relatedUserId: fromUserId,
        amount,
        reason,
        entryType: amount > 0 ? "credit" : "debit",
        transactionType: "add",
      })),
    });
  });
};

type TransferBalanceOptions = {
  prisma: ExtendedPrismaClient;
  fromUserId: string;
  toUserId: string;
  guildId: string;
  amount: number;
  reason: string | null;
  fromWalletName?: string;
  toWalletName?: string;
  skipAmountCheck?: boolean;
} & GetCurrencyConditionOptions;

export const transferBalance = async ({
  prisma,
  fromUserId,
  toUserId,
  guildId,
  amount,
  reason,
  fromWalletName,
  toWalletName,
  skipAmountCheck = false,
  ...currencyOptions
}: TransferBalanceOptions) => {
  return await prisma.$transaction(async (tx) => {
    if (!skipAmountCheck && amount <= 0) throw new InvalidAmountError();

    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const fromWallet = await getWallet({
      prisma,
      userId: fromUserId,
      guildId,
      walletName: fromWalletName,
      currencyId: currency.id,
    });

    if (fromWallet.balance < amount) throw new InsufficientBalanceError();

    const toWallet = await getWallet({
      prisma,
      userId: toUserId,
      guildId,
      walletName: toWalletName,
      currencyId: currency.id,
    });

    if (fromWallet.id === toWallet.id) throw new SelfTransferError();

    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: {
        balance: { decrement: amount },
        transactions: {
          create: {
            relatedUserId: toUserId,
            relatedWalletId: toWallet.id,
            amount,
            reason,
            entryType: "debit",
            transactionType: "transfer",
          },
        },
      },
    });

    await tx.wallet.update({
      where: { id: toWallet.id },
      data: {
        balance: { increment: amount },
        transactions: {
          create: {
            relatedUserId: fromUserId,
            relatedWalletId: fromWallet.id,
            amount,
            reason,
            entryType: "credit",
            transactionType: "transfer",
          },
        },
      },
    });
  });
};

type TransferBalancesOptions = {
  prisma: ExtendedPrismaClient;
  fromUserId: string;
  toUserIds: string[];
  guildId: string;
  amount: number;
  reason: string | null;
  skipAmountCheck?: boolean;
} & GetCurrencyConditionOptions;

export const transferBalances = async ({
  prisma,
  fromUserId,
  toUserIds,
  guildId,
  amount,
  reason,
  skipAmountCheck = false,
  ...currencyOptions
}: TransferBalancesOptions) => {
  return await prisma.$transaction(async (tx) => {
    if (!skipAmountCheck && amount <= 0) throw new InvalidAmountError();

    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const fromWallet = await getDefaultWallet({
      prisma: nestedTransaction(tx),
      userId: fromUserId,
      guildId,
      currencySymbol: currency.symbol,
    });

    const uniqueToUserIds = [...new Set(toUserIds)];

    const sum = uniqueToUserIds.length * amount;

    if (fromWallet.balance < sum) throw new InsufficientBalanceError();

    const wallets = await getDefaultWallets({
      prisma: nestedTransaction(tx),
      userIds: uniqueToUserIds,
      guildId,
      currencyId: currency.id,
    });

    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: {
        balance: { decrement: sum },
        transactions: {
          create: {
            relatedUserId: null,
            relatedWalletId: null,
            amount: sum,
            reason,
            entryType: "debit",
            transactionType: "transfer",
          },
        },
      },
    });

    await tx.wallet.updateMany({
      data: { balance: { increment: amount } },
      where: { id: { in: wallets.map((wallet) => wallet.id) } },
    });

    await tx.transaction.createMany({
      data: wallets.map((wallet) => ({
        walletId: wallet.id,
        relatedUserId: fromUserId,
        relatedWalletId: fromWallet.id,
        amount,
        reason,
        entryType: "credit",
        transactionType: "transfer",
      })),
    });
  });
};
