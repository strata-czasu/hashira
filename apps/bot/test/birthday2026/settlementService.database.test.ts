import { afterAll, describe, expect, it } from "bun:test";
import type { PrismaTransaction } from "@hashira/db";
import { PrismaClient } from "@hashira/db";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  setBirthday2026FeatureState,
  upsertBirthday2026Config,
} from "../../src/events/birthday2026/configService";
import {
  feedBirthday2026Pig,
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "../../src/events/birthday2026/economyService";
import {
  getBirthday2026Results,
  getBirthday2026SettlementDiagnostics,
  settleBirthday2026Event,
} from "../../src/events/birthday2026/settlementService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
} from "../../src/events/birthday2026/teamService";
import { configureBirthday2026TextEarning } from "../../src/events/birthday2026/textEarningService";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

const guildIds: string[] = [];
const userIds: string[] = [];
const currencyIds: number[] = [];
const taskIds: number[] = [];

const scheduleDigestion = async (
  tx: PrismaTransaction,
  batch: { id: number; digestAt: Date },
) => {
  const task = await tx.task.create({
    data: {
      identifier: batch.id.toString(),
      handleAfter: batch.digestAt,
      data: { type: "birthday2026Digest", data: { batchId: batch.id } },
    },
  });
  taskIds.push(task.id);
};

databaseTests("Birthday 2026 final settlement", () => {
  afterAll(async () => {
    if (!prisma) return;
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.birthday2026TeamWalletTransaction.deleteMany({
      where: {
        wallet: { teamConfig: { config: { guildId: { in: guildIds } } } },
      },
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

  it("pauses inputs and locks reproducible results exactly once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const suffix = crypto.randomUUID();
    const guildId = `birthday-settlement-guild-${suffix}`;
    const actorUserId = `birthday-settlement-actor-${suffix}`;
    const memberUserIds = [0, 1, 2].map(
      (index) => `birthday-settlement-member-${index}-${suffix}`,
    );
    guildIds.push(guildId);
    userIds.push(actorUserId, ...memberUserIds);

    await prisma.guild.create({ data: { id: guildId } });
    await prisma.user.createMany({
      data: [actorUserId, ...memberUserIds].map((id) => ({ id })),
    });
    const config = await upsertBirthday2026Config(prisma, {
      guildId,
      eventStartAt: new Date("2026-08-01T18:00:00Z"),
      eventEndAt: new Date("2026-08-08T18:00:00Z"),
      timezone: "Europe/Warsaw",
      visible: true,
      enabled: true,
    });
    if (!config.ok) throw new Error(config.reason);
    const first = await createBirthday2026Team(prisma, {
      guildId,
      name: `First ${suffix}`,
      roleId: `first-role-${suffix}`,
      color: 0xff8800,
    });
    const second = await createBirthday2026Team(prisma, {
      guildId,
      name: `Second ${suffix}`,
      roleId: `second-role-${suffix}`,
      color: 0x0088ff,
    });
    if (!first.ok) throw new Error(first.reason);
    if (!second.ok) throw new Error(second.reason);

    const firstMember = memberUserIds[0];
    const secondMember = memberUserIds[1];
    const thirdMember = memberUserIds[2];
    if (!firstMember || !secondMember || !thirdMember) {
      throw new Error("Missing settlement fixture member");
    }
    await Promise.all([
      assignBirthday2026Member(prisma, {
        guildId,
        teamConfigId: first.team.id,
        userId: firstMember,
      }),
      assignBirthday2026Member(prisma, {
        guildId,
        teamConfigId: second.team.id,
        userId: secondMember,
      }),
      assignBirthday2026Member(prisma, {
        guildId,
        teamConfigId: second.team.id,
        userId: thirdMember,
      }),
    ]);
    const economy = await setupBirthday2026Economy(prisma, {
      guildId,
      currencyName: `Settlement Pasza ${suffix}`,
      currencySymbol: `S${suffix.slice(0, 6)}`,
      digestionDelaySeconds: 86_400,
      createdByUserId: actorUserId,
    });
    if (!economy.ok) throw new Error(economy.reason);
    currencyIds.push(economy.currencyId);
    const textEarning = await configureBirthday2026TextEarning(prisma, {
      guildId,
      windowSeconds: 60,
      dailyCap: 10,
    });
    if (!textEarning.ok) throw new Error(textEarning.reason);

    for (const userId of memberUserIds) {
      const grant = await grantBirthday2026Pasza(prisma, {
        guildId,
        userId,
        amount: 30,
        sourceKey: `settlement-grant:${userId}`,
        createdByUserId: actorUserId,
        reason: "Settlement fixture",
      });
      if (!grant.ok) throw new Error(grant.reason);
    }
    const acceptedAt = new Date("2026-08-02T18:00:00Z");
    for (const [userId, amount] of [
      [firstMember, 20],
      [secondMember, 10],
      [thirdMember, 10],
    ] as const) {
      const feed = await feedBirthday2026Pig(prisma, {
        guildId,
        userId,
        amount,
        sourceKey: `settlement-feed:${userId}`,
        acceptedAt,
        reason: "Settlement fixture",
        scheduleDigestion,
      });
      if (!feed.ok) throw new Error(feed.reason);
    }

    const settlementInput = {
      guildId,
      settledAt: new Date("2026-08-03T18:00:00Z"),
      settledByUserId: actorUserId,
    };
    expect(await settleBirthday2026Event(prisma, settlementInput)).toEqual({
      ok: false,
      reason: "event_open",
    });
    await setBirthday2026FeatureState(prisma, guildId, { enabled: false });

    const [settlement, racingGrant] = await Promise.all([
      settleBirthday2026Event(prisma, settlementInput),
      grantBirthday2026Pasza(prisma, {
        guildId,
        userId: firstMember,
        amount: 1,
        sourceKey: `racing-settlement-${suffix}`,
        createdByUserId: actorUserId,
        reason: "Concurrent settlement boundary",
      }),
    ]);
    if (!settlement.ok) throw new Error(settlement.reason);
    if (!racingGrant.ok) {
      expect(racingGrant.reason).toBe("event_settled");
    }
    expect(settlement).toMatchObject({
      created: true,
      settlement: {
        digestedPendingPasza: 40,
        discardedPersonalPasza: racingGrant.ok ? 51 : 50,
        teamResults: [
          {
            rank: 1,
            teamConfigId: second.team.id,
            permanentWeight: 20,
            contributorCount: 2,
          },
          {
            rank: 2,
            teamConfigId: first.team.id,
            permanentWeight: 20,
            contributorCount: 1,
          },
        ],
        individualResults: [
          { userId: firstMember, amount: 20, category: "topContributor" },
        ],
      },
    });
    expect(await settleBirthday2026Event(prisma, settlementInput)).toMatchObject({
      ok: true,
      created: false,
      settlement: { configId: config.config.id },
    });
    const storedResults = await getBirthday2026Results(prisma, guildId);
    expect(storedResults?.configId).toBe(config.config.id);
    expect(storedResults?.teamResults[0]?.teamConfigId).toBe(second.team.id);

    expect(
      await prisma.wallet.findMany({
        where: { currencyId: economy.currencyId, default: true },
        select: { balance: true },
      }),
    ).toEqual([{ balance: 0 }, { balance: 0 }, { balance: 0 }]);
    expect(
      await prisma.birthday2026FeedBatch.count({
        where: { configId: config.config.id, digestedAt: null },
      }),
    ).toBe(0);
    expect(
      await prisma.task.count({
        where: { id: { in: taskIds }, status: "cancelled" },
      }),
    ).toBe(3);
    expect(
      await getBirthday2026SettlementDiagnostics(
        prisma,
        guildId,
        settlementInput.settledAt,
      ),
    ).toMatchObject({
      pendingBatchCount: 0,
      pendingPasza: 0,
      overdueBatchCount: 0,
      missingTaskCount: 0,
    });
    expect(
      await grantBirthday2026Pasza(prisma, {
        guildId,
        userId: firstMember,
        amount: 1,
        sourceKey: `after-settlement-${suffix}`,
        createdByUserId: actorUserId,
        reason: "Must remain locked",
      }),
    ).toEqual({ ok: false, reason: "event_settled" });
    expect(
      await setBirthday2026FeatureState(prisma, guildId, {
        enabled: true,
      }),
    ).toEqual({ ok: false, reason: "event_settled" });
  });
});
