import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient, type PrismaTransaction } from "@hashira/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  digestBirthday2026FeedBatch,
  feedBirthday2026Pig,
  getBirthday2026EconomyStatus,
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "../../src/events/birthday2026/economyService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
} from "../../src/events/birthday2026/teamService";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    })
  : null;

const guildIds: string[] = [];
const userIds: string[] = [];
const currencyIds: number[] = [];
const taskIds: number[] = [];

const createFixture = async (digestionDelaySeconds: number) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const suffix = crypto.randomUUID();
  const guildId = `birthday-economy-guild-${suffix}`;
  const actorUserId = `birthday-economy-actor-${suffix}`;
  const memberUserId = `birthday-economy-member-${suffix}`;
  guildIds.push(guildId);
  userIds.push(actorUserId, memberUserId);

  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({
    data: [{ id: actorUserId }, { id: memberUserId }],
  });

  const configResult = await upsertBirthday2026Config(prisma, {
    guildId,
    eventStartAt: new Date("2026-08-01T18:00:00Z"),
    eventEndAt: new Date("2026-08-08T18:00:00Z"),
    timezone: "Europe/Warsaw",
    visible: true,
    enabled: true,
  });
  if (!configResult.ok) throw new Error(configResult.reason);

  const teamResult = await createBirthday2026Team(prisma, {
    guildId,
    name: `Team ${suffix}`,
    roleId: `role-${suffix}`,
    color: 0xff8800,
  });
  if (!teamResult.ok) throw new Error(teamResult.reason);

  const assignment = await assignBirthday2026Member(prisma, {
    guildId,
    teamConfigId: teamResult.team.id,
    userId: memberUserId,
  });
  if (!assignment.ok) throw new Error(assignment.reason);

  const setup = await setupBirthday2026Economy(prisma, {
    guildId,
    currencyName: `Pasza ${suffix}`,
    currencySymbol: `P${suffix.slice(0, 6)}`,
    digestionDelaySeconds,
    createdByUserId: actorUserId,
  });
  if (!setup.ok) throw new Error(setup.reason);
  currencyIds.push(setup.currencyId);

  return {
    actorUserId,
    config: configResult.config,
    currencyId: setup.currencyId,
    guildId,
    memberUserId,
    suffix,
    team: teamResult.team,
  };
};

const scheduleDigestion = async (
  tx: PrismaTransaction,
  batch: { id: number; digestAt: Date },
) => {
  const task = await tx.task.create({
    data: {
      identifier: batch.id.toString(),
      handleAfter: batch.digestAt,
      data: {
        type: "birthday2026Digest",
        data: { batchId: batch.id },
      },
    },
  });
  taskIds.push(task.id);
};

databaseTests("Birthday 2026 economy services", () => {
  afterAll(async () => {
    if (!prisma) return;

    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.birthday2026TeamWalletTransaction.deleteMany({
      where: {
        wallet: {
          teamConfig: {
            config: { guildId: { in: guildIds } },
          },
        },
      },
    });
    await prisma.birthday2026Config.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.transaction.deleteMany({
      where: { wallet: { currencyId: { in: currencyIds } } },
    });
    await prisma.wallet.deleteMany({
      where: { currencyId: { in: currencyIds } },
    });
    await prisma.currency.deleteMany({ where: { id: { in: currencyIds } } });
    await prisma.team.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("sets up explicit economy values and provisions wallets for later teams", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(60);

    const repeatedSetup = await setupBirthday2026Economy(prisma, {
      guildId: fixture.guildId,
      currencyName: `Pasza ${fixture.suffix}`,
      currencySymbol: `P${fixture.suffix.slice(0, 6)}`,
      digestionDelaySeconds: 60,
      createdByUserId: fixture.actorUserId,
    });
    expect(repeatedSetup.ok).toBe(true);
    expect(
      await prisma.birthday2026EconomyConfig.findUnique({
        where: { configId: fixture.config.id },
      }),
    ).toMatchObject({
      currencyId: fixture.currencyId,
      digestionDelaySeconds: 60,
    });

    const laterTeam = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `Later ${fixture.suffix}`,
      roleId: `later-role-${fixture.suffix}`,
      color: 0x0088ff,
    });
    if (!laterTeam.ok) throw new Error(laterTeam.reason);

    const wallet = await prisma.birthday2026TeamWallet.findUnique({
      where: { teamConfigId: laterTeam.team.id },
    });
    expect(wallet).toMatchObject({
      balance: 0,
      currencyId: fixture.currencyId,
      permanentWeight: 0,
    });
  });

  it("grants, feeds, and digests exactly once while conserving Pasza", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(60);

    const grantInput = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      amount: 100,
      sourceKey: `grant-${fixture.suffix}`,
      createdByUserId: fixture.actorUserId,
      reason: "Slice 2 integration grant",
    };
    const grant = await grantBirthday2026Pasza(prisma, grantInput);
    const repeatedGrant = await grantBirthday2026Pasza(prisma, grantInput);
    expect(grant).toMatchObject({ ok: true, created: true, walletBalance: 100 });
    expect(repeatedGrant).toMatchObject({
      ok: true,
      created: false,
      walletBalance: 100,
    });

    const acceptedAt = new Date("2026-08-01T18:00:00Z");
    const feedInput = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      amount: 40,
      sourceKey: `feed-${fixture.suffix}`,
      acceptedAt,
      reason: "Slice 2 integration feed",
      scheduleDigestion,
    };
    const feed = await feedBirthday2026Pig(prisma, feedInput);
    const repeatedFeed = await feedBirthday2026Pig(prisma, feedInput);
    expect(feed).toMatchObject({
      ok: true,
      created: true,
      personalBalance: 60,
      teamBalance: 40,
    });
    expect(repeatedFeed).toMatchObject({
      ok: true,
      created: false,
      personalBalance: 60,
      teamBalance: 40,
    });
    if (!feed.ok) throw new Error(feed.reason);

    const pendingStatus = await getBirthday2026EconomyStatus(prisma, fixture.guildId);
    expect(pendingStatus?.[0]).toMatchObject({
      balance: 40,
      unresolvedFeed: 40,
      permanentWeight: 0,
      reconciled: true,
    });
    expect(
      await prisma.task.count({
        where: {
          identifier: feed.batch.id.toString(),
          data: { path: ["type"], equals: "birthday2026Digest" },
        },
      }),
    ).toBe(1);

    const digestionInput = {
      batchId: feed.batch.id,
      processedAt: feed.batch.digestAt,
      reason: "Slice 2 integration digestion",
    };
    if (!connectionString) throw new Error("DATABASE_TEST_URL is required");
    const restartedPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const digestion = await digestBirthday2026FeedBatch(
      restartedPrisma,
      digestionInput,
    );
    await restartedPrisma.$disconnect();
    expect(digestion).toMatchObject({
      ok: true,
      digested: true,
      amount: 40,
      permanentWeight: 40,
      teamBalance: 0,
    });
    expect(await digestBirthday2026FeedBatch(prisma, digestionInput)).toMatchObject({
      ok: true,
      digested: false,
      permanentWeight: 40,
      teamBalance: 0,
    });

    const finalStatus = await getBirthday2026EconomyStatus(prisma, fixture.guildId);
    expect(finalStatus?.[0]).toMatchObject({
      balance: 0,
      unresolvedFeed: 0,
      permanentWeight: 40,
      reconciled: true,
    });

    const personalWallet = await prisma.wallet.findFirstOrThrow({
      where: {
        userId: fixture.memberUserId,
        currencyId: fixture.currencyId,
      },
    });
    expect(
      personalWallet.balance +
        (finalStatus?.[0]?.balance ?? 0) +
        (finalStatus?.[0]?.permanentWeight ?? 0),
    ).toBe(100);
    expect(
      await prisma.birthday2026TeamWalletTransaction.findMany({
        where: { feedBatchId: feed.batch.id },
        orderBy: { id: "asc" },
        select: { source: true },
      }),
    ).toEqual([{ source: "feed" }, { source: "digestion" }]);
  });

  it("prevents concurrent feeds from overspending", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(60);

    const grant = await grantBirthday2026Pasza(prisma, {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      amount: 100,
      sourceKey: `grant-${fixture.suffix}`,
      createdByUserId: fixture.actorUserId,
      reason: "Concurrency grant",
    });
    if (!grant.ok) throw new Error(grant.reason);

    const results = await Promise.all(
      ["a", "b"].map((key) =>
        feedBirthday2026Pig(prisma, {
          guildId: fixture.guildId,
          userId: fixture.memberUserId,
          amount: 70,
          sourceKey: `feed-${key}-${fixture.suffix}`,
          acceptedAt: new Date("2026-08-01T18:00:00Z"),
          reason: `Concurrency feed ${key}`,
          scheduleDigestion,
        }),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.filter(
        (result) => !result.ok && result.reason === "insufficient_balance",
      ),
    ).toHaveLength(1);

    const wallet = await prisma.wallet.findFirstOrThrow({
      where: {
        userId: fixture.memberUserId,
        currencyId: fixture.currencyId,
      },
    });
    const status = await getBirthday2026EconomyStatus(prisma, fixture.guildId);
    expect(wallet.balance).toBe(30);
    expect(status?.[0]).toMatchObject({
      balance: 70,
      unresolvedFeed: 70,
      permanentWeight: 0,
      reconciled: true,
    });
    expect(
      await prisma.birthday2026FeedBatch.count({
        where: { configId: fixture.config.id },
      }),
    ).toBe(1);
    const batches = await prisma.birthday2026FeedBatch.findMany({
      where: { configId: fixture.config.id },
      select: { id: true },
    });
    expect(
      await prisma.task.count({
        where: {
          data: { path: ["type"], equals: "birthday2026Digest" },
          identifier: { in: batches.map((batch) => batch.id.toString()) },
        },
      }),
    ).toBe(1);
  });
});
