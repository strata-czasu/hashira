import type { Item, ItemType, PrismaTransaction } from "@hashira/db";
import { bold, inlineCode } from "discord.js";

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
    include: {
      item: true,
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

export const formatItem = ({ name, id }: Item) =>
  `${bold(name)} [${inlineCode(id.toString())}]`;

export const formatBalance = (balance: number, currencySymbol: string) =>
  inlineCode(`${balance.toLocaleString("pl-PL")}${currencySymbol}`);

export const getTypeNameForList = (type: ItemType): string => {
  switch (type) {
    case "profileTitle":
      return "(T)";
    case "item":
      return "";
  }
};
