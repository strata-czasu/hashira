import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { ExtendedPrismaClient } from "@hashira/db";
import { PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  UserInventoryLimitExceededError,
  UserPurchaseLimitExceededError,
} from "../../src/economy/economyError";
import { purchaseShopItem } from "../../src/economy/managers/shopService";

const connectionString = process.env.DATABASE_TEST_URL;
let prisma: PrismaClient;
const guildIds: string[] = [];
const userIds: string[] = [];

/**
 * Returns an `arrive` function that blocks until every party has arrived, then
 * releases them together. Falls back to releasing after `timeoutMs` so the
 * tests can never deadlock: if a fix serializes purchases before the vulnerable
 * read (e.g. an early per-user lock) or removes the read entirely, one party
 * may never arrive — the test then degrades to a plain concurrent run and the
 * final invariant assertions decide the outcome.
 */
const rendezvous = (parties: number, timeoutMs = 1_000) => {
  let arrived = 0;
  const gate = Promise.withResolvers<void>();
  const fallback = setTimeout(() => gate.resolve(), timeoutMs);

  return async () => {
    arrived += 1;
    if (arrived >= parties) {
      clearTimeout(fallback);
      gate.resolve();
    }
    await gate.promise;
  };
};

/**
 * Returns a client that parks the given Prisma operation — including inside
 * interactive transactions — until every concurrent caller has reached it.
 * This forces the check-then-act race deterministically: all purchases perform
 * their limit-check read before any of them proceeds to write.
 */
const barrieredOn = (
  client: PrismaClient,
  model: string,
  operation: string,
  arrive: () => Promise<void>,
): ExtendedPrismaClient =>
  client.$extends({
    query: {
      async $allOperations({
        model: queriedModel,
        operation: queriedOperation,
        args,
        query,
      }) {
        if (queriedModel === model && queriedOperation === operation) await arrive();
        return query(args);
      },
    },
  }) as unknown as ExtendedPrismaClient;

type ShopFixtureOptions = {
  listingCount: number;
  perUserLimit: number | null;
  userPurchaseLimit: number | null;
};

const createShopFixture = async ({
  listingCount,
  perUserLimit,
  userPurchaseLimit,
}: ShopFixtureOptions) => {
  const id = crypto.randomUUID();
  const guildId = `inventory-concurrency-guild-${id}`;
  const userId = `inventory-concurrency-user-${id}`;

  guildIds.push(guildId);
  userIds.push(userId);

  await prisma.user.create({ data: { id: userId } });
  await prisma.guild.create({ data: { id: guildId } });

  const currency = await prisma.currency.create({
    data: {
      name: `Inventory concurrency currency ${id}`,
      symbol: `inventory-concurrency-${id}`,
      guildId,
      createdBy: userId,
    },
  });
  const wallet = await prisma.wallet.create({
    data: {
      name: "Wallet",
      userId,
      guildId,
      currencyId: currency.id,
      default: true,
      balance: 100,
    },
  });
  const item = await prisma.item.create({
    data: {
      guildId,
      createdBy: userId,
      name: `Inventory concurrency item ${id}`,
      perUserLimit,
    },
  });
  const shopItems = await Promise.all(
    Array.from({ length: listingCount }, (_, index) =>
      prisma.shopItem.create({
        data: {
          itemId: item.id,
          currencyId: currency.id,
          price: 10,
          globalStock: 10,
          userPurchaseLimit,
          createdBy: userId,
          createdAt: new Date(Date.now() + index),
        },
      }),
    ),
  );

  return { guildId, userId, wallet, item, shopItems };
};

const inventoryDatabaseTests = describe.skipIf(!connectionString);

inventoryDatabaseTests("inventory limit concurrency", () => {
  beforeAll(() => {
    if (!connectionString) throw new Error("DATABASE_TEST_URL is required");
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: { wallet: { guildId: { in: guildIds } } },
    });
    await prisma.shopItemPurchase.deleteMany({
      where: { shopItem: { item: { guildId: { in: guildIds } } } },
    });
    await prisma.inventoryItem.deleteMany({
      where: { item: { guildId: { in: guildIds } } },
    });
    await prisma.inventoryItemTotal.deleteMany({
      where: { item: { guildId: { in: guildIds } } },
    });
    await prisma.shopItem.deleteMany({
      where: { item: { guildId: { in: guildIds } } },
    });
    await prisma.item.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.wallet.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.currency.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("does not exceed a per-listing purchase limit", async () => {
    const fixture = await createShopFixture({
      listingCount: 1,
      perUserLimit: null,
      userPurchaseLimit: 1,
    });
    const shopItem = fixture.shopItems[0];
    if (!shopItem) throw new Error("Missing shop item fixture");

    // Park both purchases on the vulnerable purchase-total read so both check
    // the limit before either writes. The guarded-counter fix removes this
    // read, so the barrier simply never fires and the guarded update alone
    // serializes the purchases.
    const arrive = rendezvous(2);
    const barriered = barrieredOn(prisma, "ShopItemPurchase", "findUnique", arrive);

    const purchase = () =>
      purchaseShopItem({
        prisma: barriered,
        shopItemId: shopItem.id,
        userId: fixture.userId,
        guildId: fixture.guildId,
      });

    const results = await Promise.allSettled([purchase(), purchase()]);
    const [wallet, updatedShopItem, purchaseTotal, activeCopies, debitTransactions] =
      await Promise.all([
        prisma.wallet.findUniqueOrThrow({ where: { id: fixture.wallet.id } }),
        prisma.shopItem.findUniqueOrThrow({ where: { id: shopItem.id } }),
        prisma.shopItemPurchase.aggregate({
          where: { shopItemId: shopItem.id, userId: fixture.userId },
          _sum: { quantity: true },
        }),
        prisma.inventoryItem.count({
          where: {
            userId: fixture.userId,
            itemId: fixture.item.id,
            deletedAt: null,
          },
        }),
        prisma.transaction.count({
          where: { walletId: fixture.wallet.id, entryType: "debit" },
        }),
      ]);

    const rejected = results.find((result) => result.status === "rejected");
    expect({
      fulfilled: results.filter((result) => result.status === "fulfilled").length,
      rejected: results.filter((result) => result.status === "rejected").length,
      rejectedWithExpectedError:
        rejected?.status === "rejected" &&
        rejected.reason instanceof UserPurchaseLimitExceededError,
      purchaseQuantity: purchaseTotal._sum.quantity ?? 0,
      activeCopies,
      soldCount: updatedShopItem.soldCount,
      walletBalance: wallet.balance,
      debitTransactions,
    }).toEqual({
      fulfilled: 1,
      rejected: 1,
      rejectedWithExpectedError: true,
      purchaseQuantity: 1,
      activeCopies: 1,
      soldCount: 1,
      walletBalance: 90,
      debitTransactions: 1,
    });
  });

  it("does not exceed an item ownership limit across listings", async () => {
    const fixture = await createShopFixture({
      listingCount: 2,
      perUserLimit: 1,
      userPurchaseLimit: null,
    });
    const [firstShopItem, secondShopItem] = fixture.shopItems;
    if (!firstShopItem || !secondShopItem) {
      throw new Error("Missing shop item fixtures");
    }

    // Park both purchases on the vulnerable ownership-count read so both check
    // the limit before either writes. The guarded-counter fix removes this
    // read, so the barrier simply never fires and the guarded update alone
    // serializes the purchases.
    const arrive = rendezvous(2);
    const barriered = barrieredOn(prisma, "InventoryItem", "count", arrive);

    const purchase = (shopItemId: number) =>
      purchaseShopItem({
        prisma: barriered,
        shopItemId,
        userId: fixture.userId,
        guildId: fixture.guildId,
      });

    const results = await Promise.allSettled([
      purchase(firstShopItem.id),
      purchase(secondShopItem.id),
    ]);
    const [wallet, updatedShopItems, purchaseTotal, activeCopies, debitTransactions] =
      await Promise.all([
        prisma.wallet.findUniqueOrThrow({ where: { id: fixture.wallet.id } }),
        prisma.shopItem.findMany({
          where: { id: { in: [firstShopItem.id, secondShopItem.id] } },
        }),
        prisma.shopItemPurchase.aggregate({
          where: {
            shopItemId: { in: [firstShopItem.id, secondShopItem.id] },
            userId: fixture.userId,
          },
          _sum: { quantity: true },
        }),
        prisma.inventoryItem.count({
          where: {
            userId: fixture.userId,
            itemId: fixture.item.id,
            deletedAt: null,
          },
        }),
        prisma.transaction.count({
          where: { walletId: fixture.wallet.id, entryType: "debit" },
        }),
      ]);

    const rejected = results.find((result) => result.status === "rejected");
    expect({
      fulfilled: results.filter((result) => result.status === "fulfilled").length,
      rejected: results.filter((result) => result.status === "rejected").length,
      rejectedWithExpectedError:
        rejected?.status === "rejected" &&
        rejected.reason instanceof UserInventoryLimitExceededError,
      purchaseQuantity: purchaseTotal._sum.quantity ?? 0,
      activeCopies,
      soldCounts: updatedShopItems.map(({ soldCount }) => soldCount).sort(),
      walletBalance: wallet.balance,
      debitTransactions,
    }).toEqual({
      fulfilled: 1,
      rejected: 1,
      rejectedWithExpectedError: true,
      purchaseQuantity: 1,
      activeCopies: 1,
      soldCounts: [0, 1],
      walletBalance: 90,
      debitTransactions: 1,
    });
  });
});
