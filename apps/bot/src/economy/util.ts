import { bold, inlineCode } from "discord.js";

import type { Currency, Item, ItemType, PrismaTransaction } from "@hashira/db";

import { CurrencyNotFoundError, InvalidAmountError } from "./economyError";

export type GetCurrencyConditionOptions = { currencySymbol: string } | { currencyId: number };

/**
 * Resolve the guild's configured default currency, or null when none is configured.
 */
export const getGuildDefaultCurrency = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Currency | null> => {
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
    include: { defaultCurrency: true },
  });

  return settings?.defaultCurrency ?? null;
};

export const getGuildDefaultCurrencySymbol = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<string | null> => (await getGuildDefaultCurrency(prisma, guildId))?.symbol ?? null;

export const getRequiredGuildDefaultCurrency = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Currency> => {
  const currency = await getGuildDefaultCurrency(prisma, guildId);
  if (!currency) throw new CurrencyNotFoundError();
  return currency;
};

export const validateNonNegativeAmount = (amount: number): void => {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new InvalidAmountError();
  }
};

export const getItem = (prisma: PrismaTransaction, id: number, guildId: string) =>
  prisma.item.findFirst({
    where: {
      id,
      deletedAt: null,
      guildId,
    },
  });

export const getShopItem = async (prisma: PrismaTransaction, id: number, guildId: string) =>
  prisma.shopItem.findFirst({
    where: {
      id,
      deletedAt: null,
      item: { guildId },
    },
    include: {
      item: true,
    },
  });

export const getInventoryItem = async (
  prisma: PrismaTransaction,
  itemId: number,
  guildId: string,
  userId: string,
) =>
  prisma.inventoryItem.findFirst({
    where: {
      itemId,
      userId,
      deletedAt: null,
      item: { guildId },
    },
  });

export const getInventoryItems = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
  itemIds?: number[],
) =>
  prisma.inventoryItem.findMany({
    where: {
      userId,
      deletedAt: null,
      item: { guildId },
      ...(itemIds ? { itemId: { in: itemIds } } : {}),
    },
    include: {
      item: true,
    },
  });

export const formatItem = ({ name, id }: Item) => `${bold(name)} [${inlineCode(id.toString())}]`;

export const formatBalance = (balance: number, currencySymbol: string) =>
  inlineCode(`${balance.toLocaleString("pl-PL")}${currencySymbol}`);

export const getTypeNameForList = (type: ItemType): string => {
  switch (type) {
    case "profileTitle":
      return "(T)";
    case "badge":
      return "(O)";
    case "staticTintColor":
      return "(K)";
    case "customTintColorAccess":
      return "(KC)";
    case "dynamicTintColorAccess":
      return "(KD)";
    case "item":
      return "";
  }
};
