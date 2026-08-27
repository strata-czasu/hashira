import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "bun:test";

import { PrismaClient, type PrismaTransaction } from "@hashira/db";

import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  feedBirthday2026Pig,
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "../../src/events/birthday2026/economyService";
import { getBirthday2026Stats } from "../../src/events/birthday2026/statsService";
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

databaseTests("Birthday 2026 staff stats", () => {
  afterAll(async () => {
    if (!prisma) return;

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

  it("reports per-team and per-member pasza aggregates", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const suffix = crypto.randomUUID();
    const guildId = `birthday-stats-guild-${suffix}`;
    const actorUserId = `birthday-stats-actor-${suffix}`;
    const memberAlphaId = `birthday-stats-alpha-${suffix}`;
    const memberBetaId = `birthday-stats-beta-${suffix}`;
    guildIds.push(guildId);
    userIds.push(actorUserId, memberAlphaId, memberBetaId);

    await prisma.guild.create({ data: { id: guildId } });
    await prisma.user.createMany({
      data: [{ id: actorUserId }, { id: memberAlphaId }, { id: memberBetaId }],
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

    const alphaTeamResult = await createBirthday2026Team(prisma, {
      guildId,
      name: `Alpha ${suffix}`,
      roleId: `alpha-role-${suffix}`,
      color: 0xff8800,
    });
    const betaTeamResult = await createBirthday2026Team(prisma, {
      guildId,
      name: `Beta ${suffix}`,
      roleId: `beta-role-${suffix}`,
      color: 0x0088ff,
    });
    if (!alphaTeamResult.ok) throw new Error(alphaTeamResult.reason);
    if (!betaTeamResult.ok) throw new Error(betaTeamResult.reason);

    await assignBirthday2026Member(prisma, {
      guildId,
      teamConfigId: alphaTeamResult.team.id,
      userId: memberAlphaId,
    });
    await assignBirthday2026Member(prisma, {
      guildId,
      teamConfigId: betaTeamResult.team.id,
      userId: memberBetaId,
    });

    const setup = await setupBirthday2026Economy(prisma, {
      guildId,
      currencyName: `Pasza ${suffix}`,
      currencySymbol: `S${suffix.slice(0, 6)}`,
      digestionDelaySeconds: 3600,
      createdByUserId: actorUserId,
    });
    if (!setup.ok) throw new Error(setup.reason);
    currencyIds.push(setup.currencyId);

    const configId = configResult.config.id;
    const currencyId = setup.currencyId;

    await grantBirthday2026Pasza(prisma, {
      guildId,
      userId: memberAlphaId,
      amount: 50,
      sourceKey: `stats-grant-alpha-${suffix}`,
      createdByUserId: actorUserId,
      reason: "Grant",
    });
    await grantBirthday2026Pasza(prisma, {
      guildId,
      userId: memberBetaId,
      amount: 20,
      sourceKey: `stats-grant-beta-${suffix}`,
      createdByUserId: actorUserId,
      reason: "Grant",
    });

    const earn = async (
      userId: string,
      amount: number,
      source: "encounter" | "textActivity" | "voiceActivity",
    ) => {
      if (!prisma) throw new Error("DATABASE_TEST_URL is required");
      const wallet = await prisma.wallet.findFirstOrThrow({
        where: { userId, currencyId, default: true },
      });
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      const transaction = await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          reason: source,
          transactionType: "add",
          entryType: "credit",
        },
      });
      await prisma.birthday2026PersonalTransaction.create({
        data: {
          configId,
          userId,
          transactionId: transaction.id,
          source,
          sourceKey: `stats-${source}-${userId}-${suffix}`,
        },
      });
    };

    await earn(memberAlphaId, 30, "textActivity");
    await earn(memberAlphaId, 10, "voiceActivity");
    await earn(memberBetaId, 40, "textActivity");

    const scheduleDigestion = async (
      tx: PrismaTransaction,
      batch: { id: number; digestAt: Date },
    ) => {
      await tx.task.create({
        data: {
          identifier: batch.id.toString(),
          handleAfter: batch.digestAt,
          data: { type: "birthday2026Digest", data: { batchId: batch.id } },
        },
      });
    };

    const acceptedAt = new Date("2026-08-01T18:00:00Z");
    await feedBirthday2026Pig(prisma, {
      guildId,
      userId: memberAlphaId,
      amount: 40,
      sourceKey: `stats-feed-alpha-${suffix}`,
      acceptedAt,
      reason: "Feed",
      scheduleDigestion,
      targetTeamConfigId: alphaTeamResult.team.id,
    });
    await feedBirthday2026Pig(prisma, {
      guildId,
      userId: memberBetaId,
      amount: 10,
      sourceKey: `stats-feed-beta-${suffix}`,
      acceptedAt,
      reason: "Feed",
      scheduleDigestion,
      targetTeamConfigId: betaTeamResult.team.id,
    });

    const result = await getBirthday2026Stats(prisma, guildId);
    if (!result.ok) throw new Error(result.reason);
    const { stats } = result;

    const alpha = stats.teams.find((team) => team.teamConfigId === alphaTeamResult.team.id);
    const beta = stats.teams.find((team) => team.teamConfigId === betaTeamResult.team.id);
    expect(alpha).toMatchObject({
      memberCount: 1,
      permanentWeight: 0,
      troughBalance: 40,
      totalPasza: 40,
      contributorCount: 1,
    });
    expect(beta).toMatchObject({
      memberCount: 1,
      permanentWeight: 0,
      troughBalance: 10,
      totalPasza: 10,
      contributorCount: 1,
    });
    expect(alpha?.sharePercent ?? 0).toBeGreaterThan(beta?.sharePercent ?? 0);

    const alphaMember = stats.members.find((member) => member.userId === memberAlphaId);
    const betaMember = stats.members.find((member) => member.userId === memberBetaId);
    expect(alphaMember).toMatchObject({
      earned: 90,
      earnedText: 30,
      earnedVoice: 10,
      earnedEncounter: 0,
      earnedStaffGrant: 50,
      fed: 40,
      feedCount: 1,
      unspent: 50,
    });
    expect(betaMember).toMatchObject({
      earned: 60,
      earnedText: 40,
      earnedVoice: 0,
      earnedStaffGrant: 20,
      fed: 10,
      feedCount: 1,
      unspent: 50,
    });
    expect(stats.totalEarnedPasza).toBe(150);
    expect(stats.totalFedPasza).toBe(50);
    expect(stats.totalUnspentPasza).toBe(100);
    expect(stats.totalTeamPasza).toBe(50);

    const alphaSource = stats.sources.find(
      (source) => source.teamConfigId === alphaTeamResult.team.id,
    );
    expect(alphaSource).toMatchObject({
      text: 30,
      voice: 10,
      encounter: 0,
      staffGrant: 50,
    });
    expect(alphaSource?.textSharePercent ?? 0).toBe((30 / 90) * 100);
  });

  it("reports empty stats before the economy is configured", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const suffix = crypto.randomUUID();
    const guildId = `birthday-stats-empty-${suffix}`;
    guildIds.push(guildId);

    await prisma.guild.create({ data: { id: guildId } });
    const configResult = await upsertBirthday2026Config(prisma, {
      guildId,
      eventStartAt: new Date("2026-08-01T18:00:00Z"),
      eventEndAt: new Date("2026-08-08T18:00:00Z"),
      timezone: "Europe/Warsaw",
      visible: true,
      enabled: true,
    });
    if (!configResult.ok) throw new Error(configResult.reason);

    expect(await getBirthday2026Stats(prisma, guildId)).toEqual({
      ok: false,
      reason: "economy_not_configured",
    });
  });
});
