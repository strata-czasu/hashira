import type { PrismaTransaction } from "@hashira/db";
import { UserInventoryLimitExceededError } from "../economyError";

type GetItemCountInInventoryOptions = {
  prisma: PrismaTransaction;
  itemId: number;
  userId: string;
};

/**
 * Get the count of an item in a user's inventory.
 */
export const getItemCountInInventory = async ({
  prisma,
  itemId,
  userId,
}: GetItemCountInInventoryOptions): Promise<number> => {
  return prisma.inventoryItem.count({
    where: {
      itemId,
      userId,
      deletedAt: null,
    },
  });
};

type ReserveInventoryTotalOptions = {
  prisma: PrismaTransaction;
  userId: string;
  itemId: number;
  quantity: number;
  limit: number | null;
};

export const reserveInventoryTotal = async ({
  prisma,
  userId,
  itemId,
  quantity,
  limit,
}: ReserveInventoryTotalOptions): Promise<void> => {
  if (limit === null) {
    await prisma.inventoryItemTotal.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return;
  }

  await prisma.inventoryItemTotal.createMany({
    data: [{ userId, itemId }],
    skipDuplicates: true,
  });

  const reserved = await prisma.inventoryItemTotal.updateMany({
    where: {
      userId,
      itemId,
      quantity: { lte: limit - quantity },
    },
    data: { quantity: { increment: quantity } },
  });

  if (reserved.count === 0) {
    const total = await prisma.inventoryItemTotal.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId } },
    });
    throw new UserInventoryLimitExceededError(limit, total.quantity);
  }
};
