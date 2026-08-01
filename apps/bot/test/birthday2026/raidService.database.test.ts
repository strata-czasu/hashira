import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  setBirthday2026FeatureState,
  upsertBirthday2026Config,
} from "../../src/events/birthday2026/configService";
import {
  digestBirthday2026FeedBatch,
  feedBirthday2026Pig,
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "../../src/events/birthday2026/economyService";
import { getBirthday2026Newspaper } from "../../src/events/birthday2026/newspaperService";
import {
  configureBirthday2026Raids,
  getBirthday2026RaidAudit,
  getBirthday2026RaidStatus,
  raidBirthday2026Team,
} from "../../src/events/birthday2026/raidService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  setBirthday2026Tucznik,
} from "../../src/events/birthday2026/teamService";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

const guildIds: string[] = [];
const userIds: string[] = [];
const currencyIds: number[] = [];

databaseTests("Birthday 2026 raids", () => {
  afterAll(async () => {
    if (!prisma) return;
    await prisma.birthday2026TeamWalletTransaction.deleteMany({
      where: {
        wallet: { teamConfig: { config: { guildId: { in: guildIds } } } },
      },
    });
    await prisma.birthday2026RaidTransfer.deleteMany({
      where: { attempt: { config: { guildId: { in: guildIds } } } },
    });
    await prisma.birthday2026Config.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.transaction.deleteMany({
      where: { wallet: { currencyId: { in: currencyIds } } },
    });
    await prisma.wallet.deleteMany({ where: { currencyId: { in: currencyIds } } });
    await prisma.currency.deleteMany({ where: { id: { in: currencyIds } } });
    await prisma.team.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("moves only bounded pending batches and consumes each attempt once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const suffix = crypto.randomUUID();
    const guildId = `birthday-raid-guild-${suffix}`;
    const actorUserId = `birthday-raid-actor-${suffix}`;
    const attackerUserId = `birthday-raid-attacker-${suffix}`;
    const victimUserIds = [0, 1, 2].map(
      (index) => `birthday-raid-victim-${index}-${suffix}`,
    );
    guildIds.push(guildId);
    userIds.push(actorUserId, attackerUserId, ...victimUserIds);

    await prisma.guild.create({ data: { id: guildId } });
    await prisma.user.createMany({
      data: [actorUserId, attackerUserId, ...victimUserIds].map((id) => ({ id })),
    });
    const config = await upsertBirthday2026Config(prisma, {
      guildId,
      eventStartAt: new Date("2026-08-01T18:00:00Z"),
      eventEndAt: new Date("2026-08-08T18:00:00Z"),
      timezone: "Europe/Warsaw",
      visible: true,
      enabled: true,
      registrationEnabled: false,
    });
    if (!config.ok) throw new Error(config.reason);
    const attackerTeam = await createBirthday2026Team(prisma, {
      guildId,
      name: `Raiders ${suffix}`,
      roleId: `raiders-${suffix}`,
      color: 0xff8800,
    });
    const targetTeam = await createBirthday2026Team(prisma, {
      guildId,
      name: `Targets ${suffix}`,
      roleId: `targets-${suffix}`,
      color: 0x0088ff,
    });
    if (!attackerTeam.ok) throw new Error(attackerTeam.reason);
    if (!targetTeam.ok) throw new Error(targetTeam.reason);
    for (const [teamConfigId, memberIds] of [
      [attackerTeam.team.id, [attackerUserId]],
      [targetTeam.team.id, victimUserIds],
    ] as const) {
      for (const userId of memberIds) {
        const assignment = await assignBirthday2026Member(prisma, {
          guildId,
          teamConfigId,
          userId,
        });
        if (!assignment.ok) throw new Error(assignment.reason);
      }
    }
    for (const [teamConfigId, captainUserId] of [
      [attackerTeam.team.id, attackerUserId],
      [targetTeam.team.id, victimUserIds[0]],
    ] as const) {
      if (!captainUserId) throw new Error("Missing raid captain fixture");
      const identity = await setBirthday2026Tucznik(
        prisma,
        guildId,
        teamConfigId,
        captainUserId,
        actorUserId,
      );
      if (!identity.ok) throw new Error(identity.reason);
    }
    const economy = await setupBirthday2026Economy(prisma, {
      guildId,
      currencyName: `Raid Pasza ${suffix}`,
      currencySymbol: `R${suffix.slice(0, 6)}`,
      digestionDelaySeconds: 60,
      createdByUserId: actorUserId,
    });
    if (!economy.ok) throw new Error(economy.reason);
    currencyIds.push(economy.currencyId);
    const raidConfig = await configureBirthday2026Raids(prisma, {
      guildId,
      chargesPerTeam: 4,
      maxSteal: 4,
      protectedFloor: 4,
      cooldownSeconds: 60,
      graceSeconds: 0,
      perUserLossCap: 4,
      repeatTargetCap: 1,
    });
    if (!raidConfig.ok) throw new Error(raidConfig.reason);
    const grantAndFeed = async (
      userId: string,
      amount: number,
      key: string,
      at: Date,
    ) => {
      const grant = await grantBirthday2026Pasza(prisma, {
        guildId,
        userId,
        amount,
        sourceKey: `grant-${key}-${suffix}`,
        createdByUserId: actorUserId,
        reason: "Raid fixture",
      });
      if (!grant.ok) throw new Error(grant.reason);
      const feed = await feedBirthday2026Pig(prisma, {
        guildId,
        userId,
        amount,
        sourceKey: `feed-${key}-${suffix}`,
        acceptedAt: at,
        reason: "Raid fixture",
        scheduleDigestion: async () => {},
      });
      if (!feed.ok) throw new Error(feed.reason);
      return feed.batch;
    };

    const firstVictim = victimUserIds[0];
    if (!firstVictim) throw new Error("Missing raid victim fixture");
    const digestedBatch = await grantAndFeed(
      firstVictim,
      7,
      "permanent",
      new Date("2026-08-02T19:00:00Z"),
    );
    const digestion = await digestBirthday2026FeedBatch(prisma, {
      batchId: digestedBatch.id,
      processedAt: new Date("2026-08-02T19:01:00Z"),
      reason: "Raid fixture digestion",
    });
    expect(digestion).toMatchObject({ ok: true, digested: true, amount: 7 });
    for (const [index, userId] of victimUserIds.entries()) {
      await grantAndFeed(
        userId,
        4,
        `pending-${index}`,
        new Date(`2026-08-02T19:1${index}:00Z`),
      );
    }

    const firstInput = {
      guildId,
      captainUserId: attackerUserId,
      targetRoleId: targetTeam.team.roleId,
      sourceKey: `raid-1-${suffix}`,
      attemptedAt: new Date("2026-08-02T20:00:00Z"),
    };
    const firstResults = await Promise.all([
      raidBirthday2026Team(prisma, firstInput),
      raidBirthday2026Team(prisma, firstInput),
    ]);
    expect(firstResults.every((result) => result.ok)).toBe(true);
    expect(firstResults.filter((result) => result.ok && result.created)).toHaveLength(
      1,
    );
    expect(
      await prisma.birthday2026RaidAttempt.count({
        where: { configId: config.config.id },
      }),
    ).toBe(1);
    expect(
      await raidBirthday2026Team(prisma, {
        ...firstInput,
        sourceKey: `cooldown-${suffix}`,
        attemptedAt: new Date("2026-08-02T20:00:30Z"),
      }),
    ).toEqual({ ok: false, reason: "cooldown" });

    const second = await raidBirthday2026Team(prisma, {
      ...firstInput,
      sourceKey: `raid-2-${suffix}`,
      attemptedAt: new Date("2026-08-02T20:01:01Z"),
    });
    expect(second).toMatchObject({
      ok: true,
      created: true,
      attempt: { outcome: "success", transfer: { amount: 4 } },
    });
    const thirdInput = {
      ...firstInput,
      sourceKey: `raid-3-${suffix}`,
      attemptedAt: new Date("2026-08-02T20:02:02Z"),
    };
    expect(await raidBirthday2026Team(prisma, thirdInput)).toMatchObject({
      ok: true,
      created: true,
      attempt: { outcome: "noEligibleBatch", transfer: null },
    });
    expect(await raidBirthday2026Team(prisma, thirdInput)).toMatchObject({
      ok: true,
      created: false,
      attempt: { outcome: "noEligibleBatch", transfer: null },
    });

    const lastResults = await Promise.all([
      raidBirthday2026Team(prisma, {
        ...firstInput,
        sourceKey: `raid-4a-${suffix}`,
        attemptedAt: new Date("2026-08-02T20:03:03Z"),
      }),
      raidBirthday2026Team(prisma, {
        ...firstInput,
        sourceKey: `raid-4b-${suffix}`,
        attemptedAt: new Date("2026-08-02T20:03:03Z"),
      }),
    ]);
    expect(lastResults.filter((result) => result.ok)).toHaveLength(1);
    expect(
      lastResults.filter((result) => !result.ok && result.reason === "no_charges"),
    ).toHaveLength(1);

    const wallets = await prisma.birthday2026TeamWallet.findMany({
      where: { teamConfigId: { in: [attackerTeam.team.id, targetTeam.team.id] } },
      orderBy: { teamConfigId: "asc" },
      select: { teamConfigId: true, balance: true, permanentWeight: true },
    });
    const attackerWallet = wallets.find(
      (wallet) => wallet.teamConfigId === attackerTeam.team.id,
    );
    const targetWallet = wallets.find(
      (wallet) => wallet.teamConfigId === targetTeam.team.id,
    );
    expect(attackerWallet).toMatchObject({ balance: 8, permanentWeight: 0 });
    expect(targetWallet).toMatchObject({ balance: 4, permanentWeight: 7 });
    expect((attackerWallet?.balance ?? 0) + (targetWallet?.balance ?? 0)).toBe(12);
    expect(
      await prisma.birthday2026TeamWalletTransaction.count({
        where: {
          source: "raid",
          wallet: { teamConfig: { configId: config.config.id } },
        },
      }),
    ).toBe(4);
    expect(
      await prisma.birthday2026RaidTransfer.groupBy({
        by: ["victimUserId"],
        where: { attempt: { configId: config.config.id } },
        _sum: { amount: true },
        _count: true,
      }),
    ).toHaveLength(2);
    expect(await getBirthday2026RaidAudit(prisma, guildId)).toHaveLength(4);
    expect(
      await getBirthday2026Newspaper(prisma, guildId, new Date("2026-08-02T20:03:04Z")),
    ).toMatchObject({ raids: 4, raidLoot: 8 });
    expect(
      (await getBirthday2026RaidStatus(prisma, guildId, attackerUserId))?.attemptCount,
    ).toBe(4);
    expect(
      await configureBirthday2026Raids(prisma, {
        guildId,
        chargesPerTeam: 5,
        maxSteal: 5,
        protectedFloor: 0,
        cooldownSeconds: 0,
        graceSeconds: 0,
        perUserLossCap: 5,
        repeatTargetCap: 1,
      }),
    ).toEqual({ ok: false, reason: "raids_already_used" });

    await setBirthday2026FeatureState(prisma, guildId, { enabled: false });
    expect(
      await raidBirthday2026Team(prisma, {
        ...firstInput,
        sourceKey: `paused-${suffix}`,
        attemptedAt: new Date("2026-08-02T20:04:04Z"),
      }),
    ).toEqual({ ok: false, reason: "event_not_open" });
    expect(
      await setBirthday2026FeatureState(prisma, guildId, { enabled: true }),
    ).toEqual({ ok: false, reason: "event_not_ready" });
  });
});
