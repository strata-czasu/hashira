import type { Currency, ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";

import { KAPSLE_CURRENCY } from "./currencyCutoverService";

const dailyTransactionWhere = (guildId: string, currency: Currency) => ({
  wallet: { guildId, currencyId: currency.id },
  createdAt: { gte: currency.createdAt },
  reason: "Daily",
  transactionType: "add" as const,
  relatedWalletId: null,
  relatedUserId: null,
});

const getKapsle = (prisma: PrismaTransaction, guildId: string) =>
  prisma.currency.findFirstOrThrow({ where: { guildId, ...KAPSLE_CURRENCY } });

export type PostCutoverDailyCleanupPreview = {
  currency: Currency;
  transactionCount: number;
  affectedWalletCount: number;
  netAmount: number;
  redeemCount: number;
};

export const getPostCutoverDailyCleanupPreview = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<PostCutoverDailyCleanupPreview> => {
  const currency = await getKapsle(prisma, guildId);
  const where = dailyTransactionWhere(guildId, currency);
  const [transactions, wallets, redeemCount] = await Promise.all([
    prisma.transaction.aggregate({ where, _count: { _all: true }, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ["walletId"], where }),
    prisma.dailyPointsRedeems.count({
      where: { guildId, timestamp: { gte: currency.createdAt } },
    }),
  ]);

  return {
    currency,
    transactionCount: transactions._count._all,
    affectedWalletCount: wallets.length,
    netAmount: transactions._sum.amount ?? 0,
    redeemCount,
  };
};

export const cleanupPostCutoverDailyRewards = async ({
  prisma,
  guildId,
}: {
  prisma: ExtendedPrismaClient;
  guildId: string;
}): Promise<PostCutoverDailyCleanupPreview> =>
  prisma.$transaction(async (tx) => {
    const currency = await getKapsle(tx, guildId);
    const where = dailyTransactionWhere(guildId, currency);
    const [transactions, redeems] = await Promise.all([
      tx.transaction.findMany({ where, select: { id: true, walletId: true, amount: true } }),
      tx.dailyPointsRedeems.findMany({
        where: { guildId, timestamp: { gte: currency.createdAt } },
        select: { id: true },
      }),
    ]);
    const correctionsByWallet = Map.groupBy(transactions, (transaction) => transaction.walletId);

    for (const [walletId, walletTransactions] of correctionsByWallet) {
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            decrement: walletTransactions.reduce(
              (total, transaction) => total + transaction.amount,
              0,
            ),
          },
        },
      });
    }

    const { count: transactionCount } = await tx.transaction.deleteMany({
      where: { id: { in: transactions.map(({ id }) => id) } },
    });
    const { count: redeemCount } = await tx.dailyPointsRedeems.deleteMany({
      where: { id: { in: redeems.map(({ id }) => id) } },
    });

    return {
      currency,
      transactionCount,
      affectedWalletCount: correctionsByWallet.size,
      netAmount: transactions.reduce((total, transaction) => total + transaction.amount, 0),
      redeemCount,
    };
  });
