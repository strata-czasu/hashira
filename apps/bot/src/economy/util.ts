import type { PrismaTransaction } from "@hashira/db";
import { inlineCode } from "discord.js";
import { createPluralize } from "../util/pluralize";

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

export const getInventoryItem = async (
  prisma: PrismaTransaction,
  itemId: number,
  userId: string,
) =>
  prisma.inventoryItem.findFirst({
    where: {
      itemId,
      userId,
      deletedAt: null,
    },
  });

export const formatBalance = (balance: number, currencySymbol: string) =>
  inlineCode(`${balance.toLocaleString("pl-PL")}${currencySymbol}`);

export const pluralizeUsers = createPluralize({
  // FIXME: Keys should be sorted automatically
  2: "użytkownikom",
  1: "użytkownikowi",
});
