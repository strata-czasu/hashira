import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  InsufficientBalanceError,
  InvalidAmountError,
} from "../../src/economy/economyError";
import { purchaseShopItem } from "../../src/economy/managers/shopService";
import {
  addBalance,
  addBalances,
  transferBalance,
  transferBalances,
} from "../../src/economy/managers/transferManager";
import {
  debitWallet,
  getDefaultWallet,
  getDefaultWallets,
  getWallet,
} from "../../src/economy/managers/walletManager";

const connectionString = process.env.DATABASE_TEST_URL;
let prisma: PrismaClient;
const guildIds: string[] = [];
const userIds: string[] = [];

const getRequired = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error("Missing test fixture value");
  return value;
};

const createWalletFixture = async (recipientCount: number, sourceBalance: number) => {
  const id = crypto.randomUUID();
  const guildId = `wallet-test-guild-${id}`;
  const sourceUserId = `wallet-test-source-${id}`;
  const recipientUserIds = Array.from(
    { length: recipientCount },
    (_, index) => `wallet-test-recipient-${index}-${id}`,
  );
  const allUserIds = [sourceUserId, ...recipientUserIds];

  guildIds.push(guildId);
  userIds.push(...allUserIds);

  await prisma.user.createMany({ data: allUserIds.map((userId) => ({ id: userId })) });
  await prisma.guild.create({ data: { id: guildId } });
  const currency = await prisma.currency.create({
    data: {
      name: `Wallet test currency ${id}`,
      symbol: `wallet-test-${id}`,
      guildId,
      createdBy: sourceUserId,
    },
  });
  const wallets = await Promise.all(
    allUserIds.map((userId, index) =>
      prisma.wallet.create({
        data: {
          name: "Wallet",
          userId,
          guildId,
          currencyId: currency.id,
          default: true,
          balance: index === 0 ? sourceBalance : 0,
        },
      }),
    ),
  );

  return {
    guildId,
    sourceUserId,
    recipientUserIds,
    currency,
    sourceWallet: getRequired(wallets[0]),
    recipientWallets: wallets.slice(1),
  };
};

const walletDatabaseTests = describe.skipIf(!connectionString);

walletDatabaseTests("wallet concurrency", () => {
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

  it("allows exactly one of two concurrent transfers that cannot both be funded", async () => {
    const fixture = await createWalletFixture(2, 100);

    const results = await Promise.allSettled(
      fixture.recipientUserIds.map((toUserId) =>
        transferBalance({
          prisma,
          fromUserId: fixture.sourceUserId,
          toUserId,
          guildId: fixture.guildId,
          currencyId: fixture.currency.id,
          amount: 80,
          reason: "Concurrent transfer test",
        }),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected")?.reason,
    ).toBeInstanceOf(InsufficientBalanceError);

    const source = await prisma.wallet.findUniqueOrThrow({
      where: { id: fixture.sourceWallet.id },
    });
    const recipients = await prisma.wallet.findMany({
      where: { id: { in: fixture.recipientWallets.map((wallet) => wallet.id) } },
    });
    const transactions = await prisma.transaction.findMany({
      where: { wallet: { guildId: fixture.guildId } },
    });

    expect(source.balance).toBe(20);
    expect(recipients.map((wallet) => wallet.balance).sort()).toEqual([0, 80]);
    expect(transactions).toHaveLength(2);
  });

  it("returns one default wallet from concurrent single-wallet lookups", async () => {
    const fixture = await createWalletFixture(0, 0);
    await prisma.wallet.delete({ where: { id: fixture.sourceWallet.id } });

    const wallets = await Promise.all([
      getDefaultWallet({
        prisma,
        userId: fixture.sourceUserId,
        guildId: fixture.guildId,
        currencyId: fixture.currency.id,
      }),
      getWallet({
        prisma,
        userId: fixture.sourceUserId,
        guildId: fixture.guildId,
        currencyId: fixture.currency.id,
      }),
    ]);

    expect(wallets[0]?.id).toBe(wallets[1]?.id);
    expect(
      await prisma.wallet.count({
        where: {
          userId: fixture.sourceUserId,
          guildId: fixture.guildId,
          currencyId: fixture.currency.id,
          default: true,
        },
      }),
    ).toBe(1);
  });

  it("preserves concurrent balance additions while creating one wallet", async () => {
    const fixture = await createWalletFixture(1, 0);
    const recipientUserId = getRequired(fixture.recipientUserIds[0]);
    await prisma.wallet.delete({
      where: { id: getRequired(fixture.recipientWallets[0]).id },
    });

    await Promise.all(
      [10, 15].map((amount) =>
        addBalance({
          prisma,
          toUserId: recipientUserId,
          guildId: fixture.guildId,
          currencyId: fixture.currency.id,
          amount,
          reason: "Concurrent wallet creation test",
        }),
      ),
    );

    const wallet = await prisma.wallet.findFirstOrThrow({
      where: {
        userId: recipientUserId,
        guildId: fixture.guildId,
        currencyId: fixture.currency.id,
        default: true,
      },
    });
    expect(wallet.balance).toBe(25);
    expect(await prisma.transaction.count({ where: { walletId: wallet.id } })).toBe(2);
  });

  it("creates overlapping default-wallet batches exactly once", async () => {
    const fixture = await createWalletFixture(2, 0);
    await prisma.wallet.deleteMany({
      where: { id: { in: fixture.recipientWallets.map((wallet) => wallet.id) } },
    });
    const firstRecipient = getRequired(fixture.recipientUserIds[0]);
    const secondRecipient = getRequired(fixture.recipientUserIds[1]);

    const [wallets] = await Promise.all([
      getDefaultWallets({
        prisma,
        userIds: [firstRecipient, firstRecipient, secondRecipient],
        guildId: fixture.guildId,
        currencyId: fixture.currency.id,
      }),
      addBalances({
        prisma,
        toUserIds: [secondRecipient],
        guildId: fixture.guildId,
        currencyId: fixture.currency.id,
        amount: 5,
        reason: "Overlapping wallet batch test",
      }),
    ]);

    expect(wallets).toHaveLength(2);
    expect(new Set(wallets.map((wallet) => wallet.userId))).toEqual(
      new Set([firstRecipient, secondRecipient]),
    );
    expect(
      await prisma.wallet.count({
        where: {
          userId: { in: [firstRecipient, secondRecipient] },
          guildId: fixture.guildId,
          currencyId: fixture.currency.id,
          default: true,
        },
      }),
    ).toBe(2);
  });

  it("rolls the debit and its history entry back when a later write fails", async () => {
    const fixture = await createWalletFixture(0, 100);

    await expect(
      prisma.$transaction(async (tx) => {
        await debitWallet({
          prisma: tx,
          walletId: fixture.sourceWallet.id,
          amount: 40,
          transaction: {
            reason: "Rollback test",
            transactionType: "add",
          },
        });
        throw new Error("fail after debit");
      }),
    ).rejects.toThrow("fail after debit");

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { id: fixture.sourceWallet.id },
    });
    const transactionCount = await prisma.transaction.count({
      where: { walletId: fixture.sourceWallet.id },
    });

    expect(wallet.balance).toBe(100);
    expect(transactionCount).toBe(0);
  });

  it("deduplicates recipients and debits the full multi-transfer amount once", async () => {
    const fixture = await createWalletFixture(2, 50);
    const firstRecipient = getRequired(fixture.recipientUserIds[0]);
    const secondRecipient = getRequired(fixture.recipientUserIds[1]);

    const options = {
      prisma,
      fromUserId: fixture.sourceUserId,
      toUserIds: [firstRecipient, firstRecipient, secondRecipient],
      guildId: fixture.guildId,
      currencyId: fixture.currency.id,
      amount: 30,
      reason: "Multi-transfer test",
    };

    await expect(transferBalances(options)).rejects.toBeInstanceOf(
      InsufficientBalanceError,
    );
    expect(
      await prisma.wallet.count({
        where: {
          id: { in: fixture.recipientWallets.map((wallet) => wallet.id) },
          balance: { not: 0 },
        },
      }),
    ).toBe(0);

    await prisma.wallet.update({
      where: { id: fixture.sourceWallet.id },
      data: { balance: 100 },
    });

    await transferBalances(options);

    const wallets = await prisma.wallet.findMany({
      where: { guildId: fixture.guildId },
      orderBy: { userId: "asc" },
    });
    const transactions = await prisma.transaction.findMany({
      where: { wallet: { guildId: fixture.guildId } },
    });

    expect(wallets.reduce((sum, wallet) => sum + wallet.balance, 0)).toBe(100);
    expect(
      wallets.find((wallet) => wallet.id === fixture.sourceWallet.id)?.balance,
    ).toBe(40);
    expect(
      wallets
        .filter((wallet) => wallet.id !== fixture.sourceWallet.id)
        .map((wallet) => wallet.balance),
    ).toEqual([30, 30]);
    expect(transactions).toHaveLength(3);
  });

  it("keeps free purchases and their zero-value history entries", async () => {
    const fixture = await createWalletFixture(0, 100);
    const [freeItem, negativeItem] = await Promise.all(
      ["free", "negative"].map((name) =>
        prisma.item.create({
          data: {
            guildId: fixture.guildId,
            createdBy: fixture.sourceUserId,
            name: `${name} test item`,
          },
        }),
      ),
    );
    const freeShopItem = await prisma.shopItem.create({
      data: {
        itemId: getRequired(freeItem).id,
        currencyId: fixture.currency.id,
        price: 0,
        createdBy: fixture.sourceUserId,
      },
    });
    const negativeShopItem = await prisma.shopItem.create({
      data: {
        itemId: getRequired(negativeItem).id,
        currencyId: fixture.currency.id,
        price: -10,
        createdBy: fixture.sourceUserId,
      },
    });

    await purchaseShopItem({
      prisma,
      shopItemId: freeShopItem.id,
      userId: fixture.sourceUserId,
      guildId: fixture.guildId,
    });
    await expect(
      purchaseShopItem({
        prisma,
        shopItemId: negativeShopItem.id,
        userId: fixture.sourceUserId,
        guildId: fixture.guildId,
      }),
    ).rejects.toBeInstanceOf(InvalidAmountError);

    const [wallet, freeTransaction, inventoryCount, negativeListing] =
      await Promise.all([
        prisma.wallet.findUniqueOrThrow({ where: { id: fixture.sourceWallet.id } }),
        prisma.transaction.findFirst({
          where: { walletId: fixture.sourceWallet.id, amount: 0, entryType: "debit" },
        }),
        prisma.inventoryItem.count({
          where: {
            userId: fixture.sourceUserId,
            itemId: { in: [getRequired(freeItem).id, getRequired(negativeItem).id] },
          },
        }),
        prisma.shopItem.findUniqueOrThrow({ where: { id: negativeShopItem.id } }),
      ]);

    expect(wallet.balance).toBe(100);
    expect(freeTransaction?.reason).toContain("free test item");
    expect(inventoryCount).toBe(1);
    expect(negativeListing.soldCount).toBe(0);
  });

  it("rolls back a wallet created by addBalance when its update fails", async () => {
    const fixture = await createWalletFixture(1, 0);
    const recipientUserId = getRequired(fixture.recipientUserIds[0]);
    await prisma.wallet.delete({
      where: { id: getRequired(fixture.recipientWallets[0]).id },
    });

    await expect(
      addBalance({
        prisma,
        toUserId: recipientUserId,
        guildId: fixture.guildId,
        currencyId: fixture.currency.id,
        amount: 2_147_483_648,
        reason: "Force wallet update rollback",
      }),
    ).rejects.toBeDefined();

    expect(
      await prisma.wallet.count({
        where: { userId: recipientUserId, currencyId: fixture.currency.id },
      }),
    ).toBe(0);
  });

  it("allows exactly one of two concurrent purchases of different shop items", async () => {
    const fixture = await createWalletFixture(0, 100);
    const items = await Promise.all(
      ["first", "second"].map((name) =>
        prisma.item.create({
          data: {
            guildId: fixture.guildId,
            createdBy: fixture.sourceUserId,
            name: `Concurrency test item ${name}`,
          },
        }),
      ),
    );
    const shopItems = await Promise.all(
      items.map((item) =>
        prisma.shopItem.create({
          data: {
            itemId: item.id,
            currencyId: fixture.currency.id,
            price: 80,
            globalStock: 10,
            createdBy: fixture.sourceUserId,
          },
        }),
      ),
    );

    const purchase = (shopItemId: number) =>
      purchaseShopItem({
        prisma,
        shopItemId,
        userId: fixture.sourceUserId,
        guildId: fixture.guildId,
      });
    const results = await Promise.allSettled(
      shopItems.map((shopItem) => purchase(shopItem.id)),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const [wallet, updatedShopItems, inventoryCount, purchaseCount, transactionCount] =
      await Promise.all([
        prisma.wallet.findUniqueOrThrow({ where: { id: fixture.sourceWallet.id } }),
        prisma.shopItem.findMany({
          where: { id: { in: shopItems.map((shopItem) => shopItem.id) } },
        }),
        prisma.inventoryItem.count({
          where: {
            itemId: { in: items.map((item) => item.id) },
            userId: fixture.sourceUserId,
          },
        }),
        prisma.shopItemPurchase.count({
          where: {
            shopItemId: { in: shopItems.map((shopItem) => shopItem.id) },
            userId: fixture.sourceUserId,
          },
        }),
        prisma.transaction.count({ where: { walletId: fixture.sourceWallet.id } }),
      ]);

    expect(wallet.balance).toBe(20);
    expect(updatedShopItems.map((shopItem) => shopItem.soldCount).sort()).toEqual([
      0, 1,
    ]);
    expect(inventoryCount).toBe(1);
    expect(purchaseCount).toBe(1);
    expect(transactionCount).toBe(1);
  });
});
