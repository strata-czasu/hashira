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
import { getDefaultWallet } from "./walletManager";

export type ShopItemWithDetails = ShopItem & {
  item: Item;
  currency: Currency;
};

export type PurchaseResult = {
  shopItem: ShopItemWithDetails;
  quantity: number;
  totalPrice: number;
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

type ListShopItemsOptions = {
  prisma: PrismaTransaction;
  guildId: string;
  currencyId?: number;
};

/**
 * List all active shop items for a guild, optionally filtered by currency.
 */
export const listShopItems = async ({
  prisma,
  guildId,
  currencyId,
}: ListShopItemsOptions): Promise<ShopItemWithDetails[]> => {
  return prisma.shopItem.findMany({
    where: {
      deletedAt: null,
      item: { guildId, deletedAt: null },
      ...(currencyId !== undefined && { currencyId }),
    },
    include: {
      item: true,
      currency: true,
    },
    orderBy: { price: "asc" },
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

  // Use a transaction for atomicity
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
    // This uses updateMany with a WHERE condition to prevent race conditions:
    // If soldCount + quantity > globalStock, the update will match 0 rows
    if (shopItem.globalStock !== null) {
      const updateResult = await tx.shopItem.updateMany({
        where: {
          id: shopItemId,
          deletedAt: null,
          // Only update if we have enough stock
          // soldCount + quantity <= globalStock
          // Rewritten as: globalStock - soldCount >= quantity
          soldCount: { lte: shopItem.globalStock - quantity },
        },
        data: {
          soldCount: { increment: quantity },
        },
      });

      if (updateResult.count === 0) {
        // Either someone else bought it, or stock is exhausted
        throw new OutOfStockError();
      }
    } else {
      // No global limit, just increment sold count for tracking
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
      // We need to rollback the stock increment
      // The transaction will handle this automatically on throw
      throw new InsufficientBalanceError();
    }

    // Deduct balance and create transaction record
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

type ValidatePurchaseOptions = {
  prisma: ExtendedPrismaClient;
  shopItemId: number;
  userId: string;
  guildId: string;
  quantity?: number;
};

export type ValidationResult =
  | { valid: true; shopItem: ShopItemWithDetails; totalPrice: number }
  | { valid: false; error: string };

/**
 * Validate if a purchase can be made without actually making it.
 * Useful for showing the user why they can't buy something.
 */
export const validatePurchase = async ({
  prisma,
  shopItemId,
  userId,
  guildId,
  quantity = 1,
}: ValidatePurchaseOptions): Promise<ValidationResult> => {
  if (quantity < 1) {
    return { valid: false, error: "Ilość musi być większa od 0" };
  }

  if (!Number.isInteger(quantity)) {
    return { valid: false, error: "Ilość musi być liczbą całkowitą" };
  }

  const shopItem = await getShopItemWithDetails({ prisma, shopItemId, guildId });
  if (!shopItem) {
    return { valid: false, error: "Nie znaleziono przedmiotu w sklepie" };
  }

  // Check global stock
  if (shopItem.globalStock !== null) {
    const remaining = shopItem.globalStock - shopItem.soldCount;
    if (remaining < quantity) {
      if (remaining === 0) {
        return { valid: false, error: "Przedmiot wyprzedany" };
      }
      return { valid: false, error: `Pozostało tylko ${remaining} sztuk` };
    }
  }

  // Check user limit
  if (shopItem.userPurchaseLimit !== null) {
    const currentPurchases = await getUserPurchaseCount({
      prisma,
      shopItemId,
      userId,
    });
    const remainingAllowed = shopItem.userPurchaseLimit - currentPurchases;
    if (remainingAllowed <= 0) {
      return { valid: false, error: "Osiągnięto limit zakupów tego przedmiotu" };
    }
    if (quantity > remainingAllowed) {
      return {
        valid: false,
        error: `Możesz kupić jeszcze tylko ${remainingAllowed} sztuk`,
      };
    }
  }

  // Check balance
  const totalPrice = shopItem.price * quantity;
  const wallet = await getDefaultWallet({
    prisma,
    userId,
    guildId,
    currencyId: shopItem.currencyId,
  });

  if (wallet.balance < totalPrice) {
    const missing = totalPrice - wallet.balance;
    return {
      valid: false,
      error: `Brakuje ${missing} ${shopItem.currency.symbol}`,
    };
  }

  return { valid: true, shopItem, totalPrice };
};
