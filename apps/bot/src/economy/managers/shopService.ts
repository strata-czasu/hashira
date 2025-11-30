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
  InsufficientBalanceError,
  InvalidAmountError,
  OutOfStockError,
  ShopItemNotFoundError,
  UserPurchaseLimitExceededError,
} from "../economyError";
import { getCurrency } from "./currencyManager";
import { getDefaultWallet } from "./walletManager";

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
 */
export const updateShopItem = async ({
  prisma,
  shopItemId,
  guildId,
  price,
  globalStock,
  userPurchaseLimit,
}: UpdateShopItemOptions): Promise<UpdateShopItemResult> => {
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
    include: {
      item: true,
      currency: true,
    },
  });

  if (!existing) {
    throw new ShopItemNotFoundError();
  }

  await prisma.shopItem.update({
    where: { id: shopItemId },
    data: { deletedAt: new Date() },
  });

  return existing;
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

type GetUserPurchaseCountOptions = {
  prisma: PrismaTransaction;
  shopItemId: number;
  userId: string;
};

/**
 * Get the total quantity a user has purchased of a specific shop item.
 */
export const getUserPurchaseCount = async ({
  prisma,
  shopItemId,
  userId,
}: GetUserPurchaseCountOptions): Promise<number> => {
  const purchase = await prisma.shopItemPurchase.findUnique({
    where: { shopItemId_userId: { shopItemId, userId } },
  });

  return purchase?.quantity ?? 0;
};

type PurchaseShopItemOptions = {
  prisma: ExtendedPrismaClient;
  shopItemId: number;
  userId: string;
  guildId: string;
  quantity?: number;
};

/**
 * Atomically purchase a shop item with stock and user limit validation.
 *
 * This function handles:
 * 1. Global stock limits (race-condition safe using conditional update)
 * 2. Per-user purchase limits
 * 3. Balance validation and deduction
 * 4. Inventory item creation
 * 5. Purchase tracking for limit enforcement
 *
 * @throws {ShopItemNotFoundError} If the shop item doesn't exist or is deleted
 * @throws {OutOfStockError} If global stock is exhausted
 * @throws {UserPurchaseLimitExceededError} If user has reached their purchase limit
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
  if (quantity < 1) {
    throw new InvalidAmountError();
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch shop item with details
    const shopItem = await getShopItemWithDetails({
      prisma: tx,
      shopItemId,
      guildId,
    });

    if (!shopItem) {
      throw new ShopItemNotFoundError();
    }

    // 2. Check user purchase limit
    if (shopItem.userPurchaseLimit !== null) {
      const currentPurchases = await getUserPurchaseCount({
        prisma: tx,
        shopItemId,
        userId,
      });

      const remainingAllowed = shopItem.userPurchaseLimit - currentPurchases;
      if (quantity > remainingAllowed) {
        throw new UserPurchaseLimitExceededError(
          shopItem.userPurchaseLimit,
          currentPurchases,
        );
      }
    }

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

    if (wallet.balance < totalPrice) {
      throw new InsufficientBalanceError();
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: totalPrice },
        transactions: {
          create: {
            amount: totalPrice,
            reason: `Zakup: ${shopItem.item.name} x${quantity}`,
            entryType: "debit",
            transactionType: "add", // TODO: Consider adding 'purchase' transaction type
          },
        },
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

    // 6. Track user purchase for limit enforcement
    await tx.shopItemPurchase.upsert({
      where: { shopItemId_userId: { shopItemId, userId } },
      create: {
        shopItemId,
        userId,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    return {
      shopItem,
      quantity,
      totalPrice,
    };
  });
};
