import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { PrismaClient } from "@hashira/db";

import { CurrencyRetiredError } from "../../src/economy/economyError";
import {
  cutoverGuildCurrency,
  KAPSLE_CURRENCY,
} from "../../src/economy/managers/currencyCutoverService";
import { purchaseShopItem } from "../../src/economy/managers/shopService";
import { addBalance, transferBalance } from "../../src/economy/managers/transferManager";
import { getDefaultWallet } from "../../src/economy/managers/walletManager";

const connectionString = process.env.DATABASE_TEST_URL;
let prisma: PrismaClient;
const guildIds: string[] = [];
const userIds: string[] = [];

const uniqueId = (prefix: string) =>
  prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

const createFixture = async () => {
  const guildId = uniqueId("cutover-guild");
  const creatorId = uniqueId("cutover-creator");
  const sourceId = uniqueId("cutover-source");
  const recipientId = uniqueId("cutover-recipient");
  guildIds.push(guildId);
  userIds.push(creatorId, sourceId, recipientId);

  await prisma.user.createMany({
    data: [creatorId, sourceId, recipientId].map((id) => ({ id })),
  });
  await prisma.guild.create({ data: { id: guildId } });
  const oldCurrency = await prisma.currency.create({
    data: {
      name: uniqueId("pkt"),
      symbol: " pkt-" + Math.random().toString(36).slice(2),
      guildId,
      createdBy: creatorId,
    },
  });
  await prisma.guildSettings.create({
    data: { guildId, defaultCurrencyId: oldCurrency.id },
  });
  const sourceWallet = await prisma.wallet.create({
    data: {
      name: "Portfel",
      userId: sourceId,
      guildId,
      currencyId: oldCurrency.id,
      default: true,
      balance: 125,
    },
  });
  await prisma.transaction.create({
    data: {
      walletId: sourceWallet.id,
      amount: 125,
      reason: "Initial balance",
      entryType: "credit",
      transactionType: "add",
    },
  });
  await prisma.dailyPointsRedeems.create({
    data: { guildId, userId: sourceId },
  });
  const item = await prisma.item.create({
    data: {
      name: uniqueId("shop-item"),
      guildId,
      createdBy: creatorId,
    },
  });
  const shopItem = await prisma.shopItem.create({
    data: {
      itemId: item.id,
      currencyId: oldCurrency.id,
      price: 20,
      globalStock: 10,
      createdBy: creatorId,
    },
  });

  return {
    guildId,
    creatorId,
    sourceId,
    recipientId,
    oldCurrency,
    sourceWallet,
    shopItem,
  };
};

const databaseTests = describe.skipIf(!connectionString);

databaseTests("currency cutover", () => {
  beforeAll(() => {
    if (!connectionString) throw new Error("DATABASE_TEST_URL is required");
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  });

  afterAll(async () => {
    await prisma.currency.updateMany({
      where: { guildId: { in: guildIds } },
      data: { retiredAt: null },
    });
    await prisma.transaction.deleteMany({ where: { wallet: { guildId: { in: guildIds } } } });
    await prisma.dailyPointsRedeems.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.shopItemPurchase.deleteMany({
      where: { shopItem: { item: { guildId: { in: guildIds } } } },
    });
    await prisma.inventoryItem.deleteMany({ where: { item: { guildId: { in: guildIds } } } });
    await prisma.inventoryItemTotal.deleteMany({
      where: { item: { guildId: { in: guildIds } } },
    });
    await prisma.shopItem.deleteMany({ where: { item: { guildId: { in: guildIds } } } });
    await prisma.item.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guildSettings.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.wallet.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.currency.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("preserves old balances and history while new wallets start at zero", async () => {
    const fixture = await createFixture();
    await cutoverGuildCurrency({
      prisma,
      guildId: fixture.guildId,
      oldCurrencyId: fixture.oldCurrency.id,
      createdBy: fixture.creatorId,
    });

    const oldWallet = await prisma.wallet.findUniqueOrThrow({
      where: { id: fixture.sourceWallet.id },
    });
    expect(oldWallet.balance).toBe(125);
    expect(await prisma.transaction.count({ where: { walletId: oldWallet.id } })).toBe(1);
    expect(
      await prisma.dailyPointsRedeems.count({
        where: { guildId: fixture.guildId, userId: fixture.sourceId },
      }),
    ).toBe(1);
    expect(
      await prisma.shopItem.findUniqueOrThrow({ where: { id: fixture.shopItem.id } }),
    ).toMatchObject({ deletedAt: expect.any(Date) });

    const settings = await prisma.guildSettings.findUniqueOrThrow({
      where: { guildId: fixture.guildId },
      include: { defaultCurrency: true },
    });
    expect(settings.defaultCurrency).toMatchObject(KAPSLE_CURRENCY);
    const newWallet = await getDefaultWallet({
      prisma,
      userId: fixture.sourceId,
      guildId: fixture.guildId,
      currencyId: settings.defaultCurrencyId!,
    });
    expect(newWallet.balance).toBe(0);
  });

  it("rejects old-currency mutations and rolls failed purchases back", async () => {
    const fixture = await createFixture();
    await cutoverGuildCurrency({
      prisma,
      guildId: fixture.guildId,
      oldCurrencyId: fixture.oldCurrency.id,
      createdBy: fixture.creatorId,
    });

    await expect(
      addBalance({
        prisma,
        toUserId: fixture.sourceId,
        guildId: fixture.guildId,
        currencyId: fixture.oldCurrency.id,
        amount: 5,
        reason: "must fail",
      }),
    ).rejects.toBeInstanceOf(CurrencyRetiredError);
    await expect(
      transferBalance({
        prisma,
        fromUserId: fixture.sourceId,
        toUserId: fixture.recipientId,
        guildId: fixture.guildId,
        currencyId: fixture.oldCurrency.id,
        amount: 5,
        reason: "must fail",
      }),
    ).rejects.toBeInstanceOf(CurrencyRetiredError);
    await expect(
      getDefaultWallet({
        prisma,
        userId: fixture.recipientId,
        guildId: fixture.guildId,
        currencyId: fixture.oldCurrency.id,
      }),
    ).rejects.toBeInstanceOf(CurrencyRetiredError);
    await expect(
      Promise.resolve(
        prisma.wallet.update({
          where: { id: fixture.sourceWallet.id },
          data: { balance: { increment: 1 } },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        prisma.wallet.create({
          data: {
            name: "Portfel",
            userId: fixture.recipientId,
            guildId: fixture.guildId,
            currencyId: fixture.oldCurrency.id,
            default: true,
          },
        }),
      ),
    ).rejects.toThrow();

    await prisma.shopItem.update({
      where: { id: fixture.shopItem.id },
      data: { deletedAt: null },
    });
    await expect(
      purchaseShopItem({
        prisma,
        shopItemId: fixture.shopItem.id,
        userId: fixture.sourceId,
        guildId: fixture.guildId,
      }),
    ).rejects.toBeInstanceOf(CurrencyRetiredError);
    expect(
      await prisma.shopItem.findUniqueOrThrow({ where: { id: fixture.shopItem.id } }),
    ).toMatchObject({ soldCount: 0 });
    expect(
      await prisma.shopItemPurchase.count({ where: { shopItemId: fixture.shopItem.id } }),
    ).toBe(0);
    expect(await prisma.inventoryItem.count({ where: { itemId: fixture.shopItem.itemId } })).toBe(
      0,
    );
  });

  it("does not affect other guilds or explicit non-default currencies", async () => {
    const fixture = await createFixture();
    const otherGuild = await createFixture();
    const eventCurrency = await prisma.currency.create({
      data: {
        name: uniqueId("event-currency"),
        symbol: " event-" + Math.random().toString(36).slice(2),
        guildId: fixture.guildId,
        createdBy: fixture.creatorId,
      },
    });

    await cutoverGuildCurrency({
      prisma,
      guildId: fixture.guildId,
      oldCurrencyId: fixture.oldCurrency.id,
      createdBy: fixture.creatorId,
    });
    await addBalance({
      prisma,
      toUserId: otherGuild.sourceId,
      guildId: otherGuild.guildId,
      currencyId: otherGuild.oldCurrency.id,
      amount: 5,
      reason: "other guild",
    });
    await addBalance({
      prisma,
      toUserId: fixture.sourceId,
      guildId: fixture.guildId,
      currencyId: eventCurrency.id,
      amount: 7,
      reason: "explicit event currency",
    });

    expect(
      await prisma.wallet.findUniqueOrThrow({
        where: { id: otherGuild.sourceWallet.id },
      }),
    ).toMatchObject({ balance: 130 });
    expect(
      await prisma.wallet.findFirstOrThrow({
        where: {
          guildId: fixture.guildId,
          userId: fixture.sourceId,
          currencyId: eventCurrency.id,
        },
      }),
    ).toMatchObject({ balance: 7 });
  });
});
