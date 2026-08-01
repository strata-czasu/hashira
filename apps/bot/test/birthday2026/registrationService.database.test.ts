import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  setBirthday2026FeatureState,
  upsertBirthday2026Config,
} from "../../src/events/birthday2026/configService";
import {
  finalizeBirthday2026Registration,
  registerBirthday2026Participant,
  withdrawBirthday2026Registration,
} from "../../src/events/birthday2026/registrationService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  setBirthday2026Tucznik,
} from "../../src/events/birthday2026/teamService";
import { configureBirthday2026TextEarning } from "../../src/events/birthday2026/textEarningService";
import { configureBirthday2026VoiceEarning } from "../../src/events/birthday2026/voiceEarningService";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

const guildIds: string[] = [];
const userIds: string[] = [];

const createFixture = async () => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const suffix = crypto.randomUUID();
  const guildId = `birthday-registration-guild-${suffix}`;
  const users = Array.from(
    { length: 7 },
    (_, index) => `birthday-registration-user-${index}-${suffix}`,
  );
  guildIds.push(guildId);
  userIds.push(...users);

  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({ data: users.map((id) => ({ id })) });
  const result = await upsertBirthday2026Config(prisma, {
    guildId,
    eventStartAt: new Date("2026-08-03T18:00:00Z"),
    eventEndAt: new Date("2026-08-10T18:00:00Z"),
    timezone: "Europe/Warsaw",
    visible: true,
    enabled: false,
    registrationEnabled: true,
  });
  if (!result.ok) throw new Error(result.reason);
  return { config: result.config, guildId, suffix, users };
};

const setupReadyTeams = async (fixture: Awaited<ReturnType<typeof createFixture>>) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const teams = [];
  for (let index = 0; index < 4; index += 1) {
    const userId = fixture.users[index];
    if (!userId) throw new Error("Missing fixture Tucznik");
    const team = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `Registration team ${index} ${fixture.suffix}`,
      roleId: `registration-role-${index}-${fixture.suffix}`,
      color: index + 1,
    });
    if (!team.ok) throw new Error(team.reason);
    const member = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: team.team.id,
      userId,
    });
    if (!member.ok) throw new Error(member.reason);
    const identity = await setBirthday2026Tucznik(
      prisma,
      fixture.guildId,
      team.team.id,
      userId,
    );
    if (!identity.ok) throw new Error(identity.reason);
    teams.push(team.team);
  }
  return teams;
};

databaseTests("Birthday 2026 registration", () => {
  afterAll(async () => {
    if (!prisma) return;
    await prisma.voiceSessionTotal.deleteMany({
      where: { voiceSession: { guildId: { in: guildIds } } },
    });
    await prisma.voiceSession.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.userTextActivity.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.birthday2026Config.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.team.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("opens registration only after all Tucznicy are ready", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    const participant = fixture.users[4];
    if (!participant) throw new Error("Missing fixture participant");
    const now = new Date("2026-08-01T18:00:00Z");

    expect(
      await registerBirthday2026Participant(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: false, reason: "teams_not_ready" });

    await setupReadyTeams(fixture);
    expect(
      await registerBirthday2026Participant(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: true });
    expect(
      await registerBirthday2026Participant(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: false, reason: "already_registered" });
    expect(
      await withdrawBirthday2026Registration(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: true });
    expect(
      await withdrawBirthday2026Registration(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: false, reason: "not_registered" });
  });

  it("finalizes the activity-balanced roster once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    await setupReadyTeams(fixture);
    const textUser = fixture.users[4];
    const voiceUser = fixture.users[5];
    if (!textUser || !voiceUser) throw new Error("Missing fixture participants");
    const registrationTime = new Date("2026-08-01T18:00:00Z");

    for (const userId of [textUser, voiceUser]) {
      const registration = await registerBirthday2026Participant(
        prisma,
        fixture.guildId,
        userId,
        registrationTime,
      );
      if (!registration.ok) throw new Error(registration.reason);
    }
    const textConfig = await configureBirthday2026TextEarning(prisma, {
      guildId: fixture.guildId,
      windowSeconds: 300,
      dailyCap: 24,
    });
    if (!textConfig.ok) throw new Error(textConfig.reason);
    const voiceConfig = await configureBirthday2026VoiceEarning(prisma, {
      guildId: fixture.guildId,
      unitSeconds: 600,
      dailyCap: 18,
    });
    if (!voiceConfig.ok) throw new Error(voiceConfig.reason);

    await prisma.userTextActivity.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        userId: textUser,
        guildId: fixture.guildId,
        messageId: `registration-message-${index}-${fixture.suffix}`,
        channelId: `registration-channel-${fixture.suffix}`,
        timestamp: new Date(`2026-07-30T18:${String(index * 5).padStart(2, "0")}:00Z`),
      })),
    });
    await prisma.voiceSession.create({
      data: {
        userId: voiceUser,
        guildId: fixture.guildId,
        channelId: `registration-voice-${fixture.suffix}`,
        joinedAt: new Date("2026-07-30T18:00:00Z"),
        leftAt: new Date("2026-07-30T19:40:00Z"),
        totals: {
          create: {
            isMuted: false,
            isDeafened: false,
            isStreaming: false,
            isVideo: false,
            isAlone: false,
            secondsSpent: 6_000,
          },
        },
      },
    });
    await prisma.birthday2026Config.update({
      where: { id: fixture.config.id },
      data: { registrationEnabled: false },
    });

    const result = await finalizeBirthday2026Registration(
      prisma,
      fixture.guildId,
      () => 0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.assignments).toHaveLength(6);
    expect(
      result.assignments.find((assignment) => assignment.userId === textUser)
        ?.activityEstimate,
    ).toBe(4);
    expect(
      result.assignments.find((assignment) => assignment.userId === voiceUser)
        ?.activityEstimate,
    ).toBe(4);
    expect(
      await prisma.birthday2026MemberState.count({
        where: { configId: fixture.config.id },
      }),
    ).toBe(6);
    expect(
      await prisma.birthday2026RosterFinalization.findUnique({
        where: { configId: fixture.config.id },
      }),
    ).not.toBeNull();
    expect(
      await finalizeBirthday2026Registration(prisma, fixture.guildId, () => 1),
    ).toEqual({ ok: false, reason: "already_finalized" });
    expect(
      await setBirthday2026FeatureState(prisma, fixture.guildId, {
        registrationEnabled: true,
      }),
    ).toEqual({ ok: false, reason: "roster_finalized" });
  });
});
