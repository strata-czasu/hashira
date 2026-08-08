import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import { setupBirthday2026Economy } from "../../src/events/birthday2026/economyService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
} from "../../src/events/birthday2026/teamService";
import {
  awardBirthday2026VoicePasza,
  configureBirthday2026VoiceEarning,
  getBirthday2026VoiceEarningDiagnostics,
} from "../../src/events/birthday2026/voiceEarningService";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

const guildIds: string[] = [];
const userIds: string[] = [];
const currencyIds: number[] = [];
const voiceSessionIds: number[] = [];

const createFixture = async (dailyCap = 18, unitSeconds = 600) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");

  const suffix = crypto.randomUUID();
  const guildId = `birthday-voice-guild-${suffix}`;
  const actorUserId = `birthday-voice-actor-${suffix}`;
  const memberUserId = `birthday-voice-member-${suffix}`;
  const nonMemberUserId = `birthday-voice-non-member-${suffix}`;
  guildIds.push(guildId);
  userIds.push(actorUserId, memberUserId, nonMemberUserId);

  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({
    data: [actorUserId, memberUserId, nonMemberUserId].map((id) => ({ id })),
  });

  const config = await upsertBirthday2026Config(prisma, {
    guildId,
    eventStartAt: new Date("2026-08-03T18:00:00Z"),
    eventEndAt: new Date("2026-08-10T18:00:00Z"),
    timezone: "Europe/Warsaw",
    visible: true,
    enabled: true,
  });
  if (!config.ok) throw new Error(config.reason);

  const team = await createBirthday2026Team(prisma, {
    guildId,
    name: `Voice Team ${suffix}`,
    roleId: `birthday-voice-role-${suffix}`,
    color: 0x55aaff,
  });
  if (!team.ok) throw new Error(team.reason);

  const assignment = await assignBirthday2026Member(prisma, {
    guildId,
    teamConfigId: team.team.id,
    userId: memberUserId,
  });
  if (!assignment.ok) throw new Error(assignment.reason);
  await prisma.birthday2026MemberState.update({
    where: {
      configId_userId: {
        configId: config.config.id,
        userId: memberUserId,
      },
    },
    data: { joinedAt: new Date("2026-08-03T18:00:00Z") },
  });

  const economy = await setupBirthday2026Economy(prisma, {
    guildId,
    currencyName: `Pasza ${suffix}`,
    currencySymbol: `P${suffix.slice(0, 6)}`,
    digestionDelaySeconds: 14_400,
    createdByUserId: actorUserId,
  });
  if (!economy.ok) throw new Error(economy.reason);
  currencyIds.push(economy.currencyId);

  const voiceEarning = await configureBirthday2026VoiceEarning(prisma, {
    guildId,
    unitSeconds,
    dailyCap,
  });
  if (!voiceEarning.ok) throw new Error(voiceEarning.reason);

  return {
    config: config.config,
    currencyId: economy.currencyId,
    guildId,
    memberUserId,
    nonMemberUserId,
  };
};

const createVoiceSession = async (input: {
  guildId: string;
  userId: string;
  joinedAt: Date;
  leftAt: Date;
  totals: {
    isAlone?: boolean;
    isDeafened?: boolean;
    isMuted?: boolean;
    secondsSpent: number;
  }[];
}) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");

  const voiceSession = await prisma.voiceSession.create({
    data: {
      channelId: `voice-${crypto.randomUUID()}`,
      guildId: input.guildId,
      userId: input.userId,
      joinedAt: input.joinedAt,
      leftAt: input.leftAt,
      totals: {
        create: input.totals.map((total) => ({
          isAlone: total.isAlone ?? false,
          isDeafened: total.isDeafened ?? false,
          isMuted: total.isMuted ?? false,
          isStreaming: false,
          isVideo: false,
          secondsSpent: total.secondsSpent,
        })),
      },
    },
  });
  voiceSessionIds.push(voiceSession.id);
  return voiceSession;
};

databaseTests("Birthday 2026 voice earning", () => {
  afterAll(async () => {
    if (!prisma) return;

    await prisma.birthday2026Config.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.transaction.deleteMany({
      where: { wallet: { currencyId: { in: currencyIds } } },
    });
    await prisma.wallet.deleteMany({ where: { currencyId: { in: currencyIds } } });
    await prisma.currency.deleteMany({ where: { id: { in: currencyIds } } });
    await prisma.voiceSessionTotal.deleteMany({
      where: { voiceSessionId: { in: voiceSessionIds } },
    });
    await prisma.voiceSession.deleteMany({ where: { id: { in: voiceSessionIds } } });
    await prisma.team.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("configures voice earning idempotently and validates its values", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();

    expect(
      await configureBirthday2026VoiceEarning(prisma, {
        guildId: fixture.guildId,
        unitSeconds: 600,
        dailyCap: 18,
      }),
    ).toMatchObject({ ok: true, config: { unitSeconds: 600, dailyCap: 18 } });
    expect(
      await configureBirthday2026VoiceEarning(prisma, {
        guildId: fixture.guildId,
        unitSeconds: 0,
        dailyCap: 18,
      }),
    ).toEqual({ ok: false, reason: "invalid_unit" });
    expect(
      await configureBirthday2026VoiceEarning(prisma, {
        guildId: fixture.guildId,
        unitSeconds: 600,
        dailyCap: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid_daily_cap" });
  });

  it("accumulates only eligible persisted seconds and awards completed units", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();

    const first = await createVoiceSession({
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      joinedAt: new Date("2026-08-03T18:00:00Z"),
      leftAt: new Date("2026-08-03T18:08:20Z"),
      totals: [
        { secondsSpent: 400 },
        { isMuted: true, secondsSpent: 100 },
        { isDeafened: true, secondsSpent: 100 },
        { isAlone: true, secondsSpent: 100 },
      ],
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: first.id }),
    ).toMatchObject({
      ok: true,
      awardedUnits: 0,
      eligibleSeconds: 400,
      status: "noop",
    });

    const second = await createVoiceSession({
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      joinedAt: new Date("2026-08-03T18:10:00Z"),
      leftAt: new Date("2026-08-03T18:13:20Z"),
      totals: [{ secondsSpent: 200 }],
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: second.id }),
    ).toMatchObject({
      ok: true,
      awardedUnits: 1,
      dailyAwardedUnits: 1,
      eligibleSeconds: 600,
      status: "awarded",
      walletBalance: 1,
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: second.id }),
    ).toMatchObject({
      ok: true,
      awardedUnits: 0,
      dailyAwardedUnits: 1,
      status: "noop",
      walletBalance: 1,
    });

    const third = await createVoiceSession({
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      joinedAt: new Date("2026-08-03T18:20:00Z"),
      leftAt: new Date("2026-08-03T18:40:00Z"),
      totals: [{ secondsSpent: 1_200 }],
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: third.id }),
    ).toMatchObject({
      ok: true,
      awardedUnits: 2,
      dailyAwardedUnits: 3,
      eligibleSeconds: 1_800,
      walletBalance: 3,
    });

    expect(
      await getBirthday2026VoiceEarningDiagnostics(prisma, fixture.guildId),
    ).toMatchObject({
      awardedPasza: 3,
      awardedTransactions: 2,
      counterTotal: 3,
      dailyRows: 1,
      reconciled: true,
    });
    expect(
      await configureBirthday2026VoiceEarning(prisma, {
        guildId: fixture.guildId,
        unitSeconds: 300,
        dailyCap: 9,
      }),
    ).toMatchObject({ ok: true, config: { unitSeconds: 300, dailyCap: 9 } });
    expect(
      await getBirthday2026VoiceEarningDiagnostics(prisma, fixture.guildId),
    ).toMatchObject({ unitSeconds: 300, dailyCap: 9 });
  });

  it("enforces the daily cap across concurrent completed sessions", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(2, 60);
    const sessions = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        createVoiceSession({
          guildId: fixture.guildId,
          userId: fixture.memberUserId,
          joinedAt: new Date(
            new Date("2026-08-03T18:00:00Z").getTime() + index * 120_000,
          ),
          leftAt: new Date(
            new Date("2026-08-03T18:01:00Z").getTime() + index * 120_000,
          ),
          totals: [{ secondsSpent: 60 }],
        }),
      ),
    );

    await Promise.all(
      sessions.map((session) =>
        awardBirthday2026VoicePasza(prisma, { voiceSessionId: session.id }),
      ),
    );

    const dailyState = await prisma.birthday2026DailyVoiceEarning.findUniqueOrThrow({
      where: {
        configId_userId_eventDayIndex: {
          configId: fixture.config.id,
          userId: fixture.memberUserId,
          eventDayIndex: 0,
        },
      },
    });
    const awards = await prisma.birthday2026PersonalTransaction.findMany({
      where: { configId: fixture.config.id, source: "voiceActivity" },
      include: { transaction: true },
    });
    expect(dailyState.awardedUnits).toBe(2);
    expect(awards.reduce((total, award) => total + award.transaction.amount, 0)).toBe(
      2,
    );
  });

  it("enforces event, membership, and join-time eligibility", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();

    const nonMember = await createVoiceSession({
      guildId: fixture.guildId,
      userId: fixture.nonMemberUserId,
      joinedAt: new Date("2026-08-03T18:00:00Z"),
      leftAt: new Date("2026-08-03T18:10:00Z"),
      totals: [{ secondsSpent: 600 }],
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: nonMember.id }),
    ).toEqual({ ok: false, reason: "member_not_found" });

    const beforeEvent = await createVoiceSession({
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      joinedAt: new Date("2026-08-03T17:50:00Z"),
      leftAt: new Date("2026-08-03T18:00:00Z"),
      totals: [{ secondsSpent: 600 }],
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: beforeEvent.id }),
    ).toEqual({ ok: false, reason: "event_not_open" });

    await prisma.birthday2026MemberState.update({
      where: {
        configId_userId: {
          configId: fixture.config.id,
          userId: fixture.memberUserId,
        },
      },
      data: { joinedAt: new Date("2026-08-03T19:00:00Z") },
    });
    const beforeJoin = await createVoiceSession({
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      joinedAt: new Date("2026-08-03T18:30:00Z"),
      leftAt: new Date("2026-08-03T18:40:00Z"),
      totals: [{ secondsSpent: 600 }],
    });
    expect(
      await awardBirthday2026VoicePasza(prisma, { voiceSessionId: beforeJoin.id }),
    ).toEqual({ ok: false, reason: "activity_before_join" });
  });

  it("resets the voice cap on the next event-anchored day", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(1, 60);
    const sessions = await Promise.all(
      ["2026-08-03T18:00:00Z", "2026-08-04T18:00:00Z"].map((joinedAt) =>
        createVoiceSession({
          guildId: fixture.guildId,
          userId: fixture.memberUserId,
          joinedAt: new Date(joinedAt),
          leftAt: new Date(new Date(joinedAt).getTime() + 60_000),
          totals: [{ secondsSpent: 60 }],
        }),
      ),
    );

    const results = await Promise.all(
      sessions.map((session) =>
        awardBirthday2026VoicePasza(prisma, { voiceSessionId: session.id }),
      ),
    );
    expect(results.map((result) => result.ok && result.awardedUnits)).toEqual([1, 1]);
  });
});
