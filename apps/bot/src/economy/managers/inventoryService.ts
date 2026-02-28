import type { PrismaTransaction } from "@hashira/db";

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
