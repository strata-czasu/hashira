import type {
  Currency,
  ExtendedPrismaClient,
  Item,
  Prisma,
  PrismaTransaction,
  ShopItem,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";

import {
  InvalidAmountError,
  InvalidStockError,
  OutOfStockError,
  ShopItemNotFoundError,
  UserPurchaseLimitExceededError,
} from "../economyError";
import { validateNonNegativeAmount } from "../util";
import { getCurrency } from "./currencyManager";
import { reserveInventoryTotal } from "./inventoryService";
import { debitWallet, getDefaultWallet } from "./walletManager";

export type ShopItemWithDetails = ShopItem & { item: Item; currency: Currency };

export type PurchaseResult = {
  shopItem: ShopItemWithDetails;
  quantity: number;
  totalPrice: number;
};

type CreateShopItemOptions = {
  prisma: PrismaTransaction;
  itemId: number;
  guildId: string;
  currencySymbol: string;
  price: number;
  createdBy: string;
  globalStock?: number | null;
  userPurchaseLimit?: number | null;
};

/**
 * Create a new shop item listing.
 *
 * @throws {Error} If the item doesn't exist or currency is not found
 */
export const createShopItem = async ({
  prisma,
  itemId,
  guildId,
  currencySymbol,
  price,
  createdBy,
  globalStock = null,
  userPurchaseLimit = null,
}: CreateShopItemOptions): Promise<ShopItemWithDetails> => {
  validateNonNegativeAmount(price);

  const currency = await getCurrency({
    prisma,
    guildId,
    currencySymbol,
  });

  return prisma.shopItem.create({
    data: {
      itemId,
      currencyId: currency.id,
      price,
      globalStock,
      userPurchaseLimit,
      createdBy,
    },
    include: {
      item: true,
      currency: true,
    },
  });
};

type UpdateShopItemOptions = {
  prisma: PrismaTransaction;
  shopItemId: number;
  guildId: string;
  price?: number | null;
  /** Set to 0 to remove limit, null to keep unchanged */
  globalStock?: number | null;
  /** Set to 0 to remove limit, null to keep unchanged */
  userPurchaseLimit?: number | null;
};

export type UpdateShopItemResult = {
  shopItem: ShopItemWithDetails;
  changes: ShopItemChanges;
};

export type ShopItemChanges = {
  price?: number;
  globalStock?: number | null;
  userPurchaseLimit?: number | null;
};

/**
 * Update an existing shop item.
 *
 * @throws {ShopItemNotFoundError} If the shop item doesn't exist
 * @throws {InvalidStockError} If globalStock is set below the current soldCount
 */
export const updateShopItem = async ({
  prisma,
  shopItemId,
  guildId,
  price,
  globalStock,
  userPurchaseLimit,
}: UpdateShopItemOptions): Promise<UpdateShopItemResult> => {
  if (price != null) validateNonNegativeAmount(price);

  const existing = await prisma.shopItem.findFirst({
    where: {
      id: shopItemId,
      deletedAt: null,
      item: { guildId },
    },
  });

  if (!existing) {
    throw new ShopItemNotFoundError();
  }

  if (globalStock != null && globalStock > 0 && existing.soldCount > globalStock) {
    throw new InvalidStockError(globalStock, existing.soldCount);
  }

  const updateData: Prisma.ShopItemUpdateInput = { editedAt: new Date() };
  const changes: ShopItemChanges = {};

  if (price != null) {
    updateData.price = price;
    changes.price = price;
  }

  if (globalStock != null) {
    const newValue = globalStock === 0 ? null : globalStock;
    updateData.globalStock = newValue;
    changes.globalStock = newValue;
  }

  if (userPurchaseLimit != null) {
    const newValue = userPurchaseLimit === 0 ? null : userPurchaseLimit;
    updateData.userPurchaseLimit = newValue;
    changes.userPurchaseLimit = newValue;
  }

  const shopItem = await prisma.shopItem.update({
    where: { id: shopItemId },
    data: updateData,
    include: {
      item: true,
      currency: true,
    },
  });

  return { shopItem, changes };
};

type DeleteShopItemOptions = {
  prisma: PrismaTransaction;
  shopItemId: number;
  guildId: string;
};

/**
 * Soft-delete a shop item.
 *
 * @throws {ShopItemNotFoundError} If the shop item doesn't exist
 */
export const deleteShopItem = async ({
  prisma,
  shopItemId,
  guildId,
}: DeleteShopItemOptions): Promise<ShopItemWithDetails> => {
  const existing = await prisma.shopItem.findFirst({
    where: {
      id: shopItemId,
      deletedAt: null,
      item: { guildId },
    },
  });

  if (!existing) {
    throw new ShopItemNotFoundError();
  }

  return await prisma.shopItem.update({
    where: { id: shopItemId },
    data: { deletedAt: new Date() },
    include: { item: true, currency: true },
  });
};

type GetShopItemOptions = {
  prisma: PrismaTransaction;
  shopItemId: number;
  guildId: string;
};

/**
 * Get a shop item with its related item and currency.
 * Only returns active (non-deleted) items that belong to the specified guild.
 */
export const getShopItemWithDetails = async ({
  prisma,
  shopItemId,
  guildId,
}: GetShopItemOptions): Promise<ShopItemWithDetails | null> => {
  return prisma.shopItem.findFirst({
    where: {
      id: shopItemId,
      deletedAt: null,
      item: { guildId, deletedAt: null },
    },
    include: {
      item: true,
      currency: true,
    },
  });
};

/**
 * Get the remaining stock for a shop item.
 * Returns null if unlimited stock.
 */
export const getRemainingStock = (shopItem: ShopItem): number | null => {
  if (shopItem.globalStock === null) return null;

  return Math.max(0, shopItem.globalStock - shopItem.soldCount);
};

type ReservePurchaseTotalOptions = {
  prisma: PrismaTransaction;
  shopItemId: number;
  userId: string;
  quantity: number;
  limit: number | null;
};

const reservePurchaseTotal = async ({
  prisma,
  shopItemId,
  userId,
  quantity,
  limit,
}: ReservePurchaseTotalOptions): Promise<void> => {
  if (limit === null) {
    await prisma.shopItemPurchase.upsert({
      where: { shopItemId_userId: { shopItemId, userId } },
      create: { shopItemId, userId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return;
  }

  await prisma.shopItemPurchase.createMany({
    data: [{ shopItemId, userId, quantity: 0 }],
    skipDuplicates: true,
  });

  const reserved = await prisma.shopItemPurchase.updateMany({
    where: {
      shopItemId,
      userId,
      quantity: { lte: limit - quantity },
    },
    data: { quantity: { increment: quantity } },
  });

  if (reserved.count === 0) {
    const total = await prisma.shopItemPurchase.findUniqueOrThrow({
      where: { shopItemId_userId: { shopItemId, userId } },
    });
    throw new UserPurchaseLimitExceededError(limit, total.quantity);
  }
};

type PurchaseShopItemOptions = {
  prisma: ExtendedPrismaClient;
  shopItemId: number;
  userId: string;
  guildId: string;
  quantity?: number;
};

/**
 * Purchase a shop item with stock and user limit validation.
 *
 * This function handles:
 * 1. Per-user inventory limits
 * 2. Per-user purchase limits
 * 3. Global stock limits (race-condition safe using conditional update)
 * 4. Balance validation and deduction
 * 5. Inventory item creation
 * 6. Purchase tracking for limit enforcement
 *
 * @throws {ShopItemNotFoundError} If the shop item doesn't exist or is deleted
 * @throws {UserInventoryLimitExceededError} If user has reached the limit of this item in their inventory
 * @throws {UserPurchaseLimitExceededError} If user has reached their purchase limit
 * @throws {OutOfStockError} If global stock is exhausted
 * @throws {InsufficientBalanceError} If user doesn't have enough balance
 * @throws {InvalidAmountError} If quantity is less than 1
 * @throws {RaceConditionError} If the purchase fails due to concurrent modification
 */
export const purchaseShopItem = async ({
  prisma,
  shopItemId,
  userId,
  guildId,
  quantity = 1,
}: PurchaseShopItemOptions): Promise<PurchaseResult> => {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new InvalidAmountError();
  }

  return await prisma.$transaction(async (tx) => {
    const shopItem = await getShopItemWithDetails({
      prisma: tx,
      shopItemId,
      guildId,
    });

    if (!shopItem) {
      throw new ShopItemNotFoundError();
    }

    // 1. Reserve against the per-user inventory limit
    await reserveInventoryTotal({
      prisma: tx,
      userId,
      itemId: shopItem.itemId,
      quantity,
      limit: shopItem.item.perUserLimit,
    });

    // 2. Reserve against the per-user purchase limit
    await reservePurchaseTotal({
      prisma: tx,
      shopItemId,
      userId,
      quantity,
      limit: shopItem.userPurchaseLimit,
    });

    // 3. Check and reserve global stock atomically
    if (shopItem.globalStock !== null) {
      const updateResult = await tx.shopItem.updateMany({
        where: {
          id: shopItemId,
          deletedAt: null,
          soldCount: { lte: shopItem.globalStock - quantity },
        },
        data: {
          soldCount: { increment: quantity },
        },
      });

      if (updateResult.count === 0) {
        throw new OutOfStockError();
      }
    } else {
      await tx.shopItem.update({
        where: { id: shopItemId },
        data: { soldCount: { increment: quantity } },
      });
    }

    // 4. Check and deduct balance
    const totalPrice = shopItem.price * quantity;

    const wallet = await getDefaultWallet({
      prisma: nestedTransaction(tx),
      userId,
      guildId,
      currencyId: shopItem.currencyId,
    });

    await debitWallet({
      prisma: tx,
      walletId: wallet.id,
      amount: totalPrice,
      transaction: {
        reason: `Zakup: ${shopItem.item.name} x${quantity}`,
        transactionType: "add" as const, // TODO: Consider adding 'purchase' transaction type
      },
    });

    // 5. Create inventory items
    const inventoryItems: Prisma.InventoryItemCreateManyInput[] = Array.from(
      { length: quantity },
      () => ({
        itemId: shopItem.itemId,
        userId,
      }),
    );

    await tx.inventoryItem.createMany({ data: inventoryItems });

    return {
      shopItem,
      quantity,
      totalPrice,
    };
  });
};
