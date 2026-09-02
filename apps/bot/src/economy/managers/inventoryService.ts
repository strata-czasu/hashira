import type { Item, PrismaTransaction } from "@hashira/db";
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

type GrantItemToUsersOptions = {
  prisma: PrismaTransaction;
  item: Item;
  userIds: string[];
};

export type GrantItemToUsersResult = {
  /** Users that received the item. */
  grantedUserIds: string[];
  /** Users that were skipped because they already hold the per-user limit. */
  overLimitUserIds: string[];
};

/**
 * Grant an item to multiple users, skipping users that already reached the
 * item's `perUserLimit`. Mirrors the admin "give item" flow so giveaway payouts
 * respect the same limit rules as manual grants.
 */
export const grantItemToUsers = async ({
  prisma,
  item,
  userIds,
}: GrantItemToUsersOptions): Promise<GrantItemToUsersResult> => {
  const uniqueUserIds = [...new Set(userIds)];

  if (item.perUserLimit === null) {
    await prisma.inventoryItem.createMany({
      data: uniqueUserIds.map((userId) => ({ itemId: item.id, userId })),
      skipDuplicates: true,
    });
    return { grantedUserIds: uniqueUserIds, overLimitUserIds: [] };
  }

  const usersHoldingItem = await prisma.inventoryItem.groupBy({
    by: ["userId"],
    where: {
      deletedAt: null,
      itemId: item.id,
      userId: { in: uniqueUserIds },
    },
    _count: true,
  });
  const perUserCounts = new Map(
    usersHoldingItem.map(({ userId, _count }) => [userId, _count]),
  );
  const perUserLimit = item.perUserLimit;

  const { grantedUserIds, overLimitUserIds } = uniqueUserIds.reduce<{
    grantedUserIds: string[];
    overLimitUserIds: string[];
  }>(
    (acc, userId) => {
      const count = perUserCounts.get(userId) ?? 0;
      if (count >= perUserLimit) acc.overLimitUserIds.push(userId);
      else acc.grantedUserIds.push(userId);
      return acc;
    },
    { grantedUserIds: [], overLimitUserIds: [] },
  );

  await prisma.inventoryItem.createMany({
    data: grantedUserIds.map((userId) => ({ itemId: item.id, userId })),
    skipDuplicates: true,
  });

  return { grantedUserIds, overLimitUserIds };
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
