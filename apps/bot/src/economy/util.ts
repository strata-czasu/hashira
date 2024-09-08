import type { PrismaTransaction } from "@hashira/db";

export type GetCurrencyConditionOptions =
  | { currencySymbol: string }
  | { currencyId: number };

export const getItem = (prisma: PrismaTransaction, id: number) =>
  prisma.item.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

export const getShopItem = async (prisma: PrismaTransaction, id: number) =>
  prisma.shopItem.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });
