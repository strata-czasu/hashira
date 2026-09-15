import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { PrismaClient } from "@hashira/db";

import { KAPSLE_CURRENCY } from "../../src/economy/managers/currencyCutoverService";
import {
  cleanupPostCutoverDailyRewards,
  getPostCutoverDailyCleanupPreview,
} from "../../src/economy/managers/postCutoverDailyCleanupService";

const connectionString = process.env.DATABASE_TEST_URL;
let prisma: PrismaClient;
const guildIds: string[] = [];
const userIds: string[] = [];

const uniqueId = (prefix: string) =>
  prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

const createFixture = async () => {
  const guildId = uniqueId("daily-cleanup-guild");
  const creatorId = uniqueId("daily-cleanup-creator");
  const firstUserId = uniqueId("daily-cleanup-user");
  const secondUserId = uniqueId("daily-cleanup-user");
  guildIds.push(guildId);
  userIds.push(creatorId, firstUserId, secondUserId);

  await prisma.user.createMany({
    data: [creatorId, firstUserId, secondUserId].map((id) => ({ id })),
  });
  await prisma.guild.create({ data: { id: guildId } });
  const currency = await prisma.currency.create({
    data: { ...KAPSLE_CURRENCY, guildId, createdBy: creatorId },
  });
  const createWallet = (userId: string) =>
    prisma.wallet.create({
      data: {
        name: "Portfel",
        userId,
        guildId,
        currencyId: currency.id,
        default: true,
        balance: 100,
      },
    });
  const firstWallet = await createWallet(firstUserId);
  const secondWallet = await createWallet(secondUserId);

  return { guildId, currency, firstUserId, secondUserId, firstWallet, secondWallet };
};

const databaseTests = describe.skipIf(!connectionString);

databaseTests("post-cutover Daily cleanup", () => {
  beforeAll(() => {
    if (!connectionString) throw new Error("DATABASE_TEST_URL is required");
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { wallet: { guildId: { in: guildIds } } } });
    await prisma.dailyPointsRedeems.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.wallet.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.currency.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("previews and reverses only post-cutover Daily effects", async () => {
    const fixture = await createFixture();
    const beforeCutover = new Date(fixture.currency.createdAt.getTime() - 1_000);
    const afterCutover = new Date(fixture.currency.createdAt.getTime() + 1_000);

    await prisma.transaction.createMany({
      data: [
        {
          walletId: fixture.firstWallet.id,
          amount: 40,
          reason: "Daily",
          entryType: "credit",
          transactionType: "add",
          createdAt: afterCutover,
        },
        {
          walletId: fixture.secondWallet.id,
          amount: -10,
          reason: "Daily",
          entryType: "debit",
          transactionType: "add",
          createdAt: afterCutover,
        },
        {
          walletId: fixture.firstWallet.id,
          amount: 20,
          reason: "Daily",
          entryType: "credit",
          transactionType: "add",
          createdAt: beforeCutover,
        },
        {
          walletId: fixture.firstWallet.id,
          amount: 5,
          reason: "Staff grant",
          entryType: "credit",
          transactionType: "add",
          createdAt: afterCutover,
        },
      ],
    });
    await prisma.dailyPointsRedeems.createMany({
      data: [
        { guildId: fixture.guildId, userId: fixture.firstUserId, timestamp: afterCutover },
        { guildId: fixture.guildId, userId: fixture.secondUserId, timestamp: beforeCutover },
      ],
    });

    const preview = await getPostCutoverDailyCleanupPreview(prisma, fixture.guildId);
    expect(preview).toMatchObject({
      transactionCount: 2,
      affectedWalletCount: 2,
      netAmount: 30,
      redeemCount: 1,
    });

    const result = await cleanupPostCutoverDailyRewards({
      prisma,
      guildId: fixture.guildId,
    });
    expect(result).toMatchObject({
      transactionCount: 2,
      affectedWalletCount: 2,
      netAmount: 30,
      redeemCount: 1,
    });
    expect(
      await prisma.wallet.findMany({
        where: { id: { in: [fixture.firstWallet.id, fixture.secondWallet.id] } },
        orderBy: { id: "asc" },
        select: { balance: true },
      }),
    ).toEqual([{ balance: 60 }, { balance: 110 }]);
    expect(await prisma.transaction.count({ where: { walletId: fixture.firstWallet.id } })).toBe(2);
    expect(await prisma.dailyPointsRedeems.count({ where: { guildId: fixture.guildId } })).toBe(1);
  });

  it("is safe to run again", async () => {
    const fixture = await createFixture();
    const result = await cleanupPostCutoverDailyRewards({
      prisma,
      guildId: fixture.guildId,
    });

    expect(result).toMatchObject({
      transactionCount: 0,
      affectedWalletCount: 0,
      netAmount: 0,
      redeemCount: 0,
    });
  });
});
