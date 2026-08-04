import type { ExtendedPrismaClient } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { InvalidAmountError, SelfTransferError } from "../economyError";
import { type GetCurrencyConditionOptions, validateNonNegativeAmount } from "../util";
import { getCurrency } from "./currencyManager";
import {
  debitWallet,
  getDefaultWallet,
  getDefaultWallets,
  getWallet,
} from "./walletManager";

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
      prisma: nestedTransaction(tx),
      userId: toUserId,
      guildId,
      walletName,
      currencyId: currency.id,
    });

    const transaction = await tx.transaction.create({
      data: {
        walletId: wallet.id,
        relatedUserId: fromUserId,
        amount,
        reason,
        entryType: amount > 0 ? "credit" : "debit",
        transactionType: "add",
      },
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });

    return { transaction, wallet: updatedWallet };
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
  ...currencyOptions
}: TransferBalanceOptions) => {
  return await prisma.$transaction(async (tx) => {
    validateNonNegativeAmount(amount);

    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const fromWallet = await getWallet({
      prisma: nestedTransaction(tx),
      userId: fromUserId,
      guildId,
      walletName: fromWalletName,
      currencyId: currency.id,
    });

    const toWallet = await getWallet({
      prisma: nestedTransaction(tx),
      userId: toUserId,
      guildId,
      walletName: toWalletName,
      currencyId: currency.id,
    });

    if (fromWallet.id === toWallet.id) throw new SelfTransferError();

    await debitWallet({
      prisma: tx,
      walletId: fromWallet.id,
      amount,
      transaction: {
        relatedUserId: toUserId,
        relatedWalletId: toWallet.id,
        reason,
        transactionType: "transfer",
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
} & GetCurrencyConditionOptions;

export const transferBalances = async ({
  prisma,
  fromUserId,
  toUserIds,
  guildId,
  amount,
  reason,
  ...currencyOptions
}: TransferBalancesOptions) => {
  return await prisma.$transaction(async (tx) => {
    validateNonNegativeAmount(amount);

    const uniqueToUserIds = [...new Set(toUserIds)].filter(
      (userId) => userId !== fromUserId,
    );
    if (uniqueToUserIds.length === 0) throw new InvalidAmountError();

    const sum = uniqueToUserIds.length * amount;
    validateNonNegativeAmount(sum);

    const currency = await getCurrency({ prisma: tx, guildId, ...currencyOptions });

    const fromWallet = await getDefaultWallet({
      prisma: nestedTransaction(tx),
      userId: fromUserId,
      guildId,
      currencySymbol: currency.symbol,
    });

    const wallets = await getDefaultWallets({
      prisma: nestedTransaction(tx),
      userIds: uniqueToUserIds,
      guildId,
      currencyId: currency.id,
    });

    await debitWallet({
      prisma: tx,
      walletId: fromWallet.id,
      amount: sum,
      transaction: {
        relatedUserId: null,
        relatedWalletId: null,
        reason,
        transactionType: "transfer",
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
