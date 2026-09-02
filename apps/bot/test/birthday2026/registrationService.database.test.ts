import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "bun:test";

import { PrismaClient } from "@hashira/db";

import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  finalizeBirthday2026Registration,
  registerBirthday2026Participant,
  withdrawBirthday2026Registration,
} from "../../src/events/birthday2026/registrationService";
import { configureBirthday2026Persona } from "../../src/events/birthday2026/statusService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  createBirthday2026TeamIdentity,
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
    { length: 11 },
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
  });
  if (!result.ok) throw new Error(result.reason);
  return { config: result.config, guildId, suffix, users };
};

const setupReadyTeams = async (
  fixture: Awaited<ReturnType<typeof createFixture>>,
  teamCount: number,
) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const teams = [];
  for (let index = 0; index < teamCount; index += 1) {
    const captainUserId = fixture.users[index * 2];
    const tucznikUserId = fixture.users[index * 2 + 1];
    if (!captainUserId || !tucznikUserId) {
      throw new Error("Missing fixture team identities");
    }
    const team = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `Registration team ${index} ${fixture.suffix}`,
      roleId: `registration-role-${index}-${fixture.suffix}`,
      color: index + 1,
    });
    if (!team.ok) throw new Error(team.reason);
    const captainMembership = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: team.team.id,
      userId: captainUserId,
    });
    if (!captainMembership.ok) throw new Error(captainMembership.reason);
    const tucznikMembership = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: team.team.id,
      userId: tucznikUserId,
    });
    if (!tucznikMembership.ok) throw new Error(tucznikMembership.reason);
    const identity = await createBirthday2026TeamIdentity(prisma, fixture.guildId, team.team.id, {
      captainUserId,
      tucznikUserId,
    });
    if (!identity.ok) throw new Error(identity.reason);
    const persona = await configureBirthday2026Persona(prisma, {
      guildId: fixture.guildId,
      teamConfigId: team.team.id,
      title: `Registration persona ${index}`,
      fallbackEmoji: "🐗",
      configuredByUserId: captainUserId,
      consentedAt: new Date("2026-08-01T18:00:00Z"),
    });
    if (!persona.ok) throw new Error(persona.reason);
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
    const participant = fixture.users[8];
    if (!participant) throw new Error("Missing fixture participant");
    const now = new Date("2026-08-01T18:00:00Z");

    expect(
      await registerBirthday2026Participant(prisma, fixture.guildId, participant, now, () => 0),
    ).toEqual({ ok: false, reason: "teams_not_ready" });

    await setupReadyTeams(fixture, 4);
    expect(
      await registerBirthday2026Participant(prisma, fixture.guildId, participant, now, () => 0),
    ).toEqual({ ok: true, assigned: false });
    expect(
      await registerBirthday2026Participant(prisma, fixture.guildId, participant, now, () => 0),
    ).toEqual({ ok: false, reason: "already_registered" });
    expect(
      await withdrawBirthday2026Registration(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: true });
    expect(
      await withdrawBirthday2026Registration(prisma, fixture.guildId, participant, now),
    ).toEqual({ ok: false, reason: "not_registered" });
    expect(
      await registerBirthday2026Participant(
        prisma,
        fixture.guildId,
        participant,
        fixture.config.eventEndAt,
        () => 0,
      ),
    ).toEqual({ ok: false, reason: "registration_closed" });
  });

  it("supports any positive number of ready teams", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");

    for (const teamCount of [1, 3, 5]) {
      const fixture = await createFixture();
      const participant = fixture.users[10];
      if (!participant) throw new Error("Missing fixture participant");

      await setupReadyTeams(fixture, teamCount);
      expect(
        await registerBirthday2026Participant(
          prisma,
          fixture.guildId,
          participant,
          new Date("2026-08-01T18:00:00Z"),
          () => 0,
        ),
      ).toEqual({ ok: true, assigned: false });
    }
  });

  it("finalizes the activity-balanced roster once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    await setupReadyTeams(fixture, 4);
    const textUser = fixture.users[8];
    const voiceUser = fixture.users[9];
    if (!textUser || !voiceUser) throw new Error("Missing fixture participants");
    const registrationTime = new Date("2026-08-01T18:00:00Z");

    for (const userId of [textUser, voiceUser]) {
      const registration = await registerBirthday2026Participant(
        prisma,
        fixture.guildId,
        userId,
        registrationTime,
        () => 0,
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
    const result = await finalizeBirthday2026Registration(prisma, fixture.guildId, () => 0);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.assignments).toHaveLength(10);
    expect(
      result.assignments.find((assignment) => assignment.userId === textUser)?.activityEstimate,
    ).toBe(4);
    expect(
      result.assignments.find((assignment) => assignment.userId === voiceUser)?.activityEstimate,
    ).toBe(4);
    expect(
      await prisma.birthday2026MemberState.count({
        where: { configId: fixture.config.id },
      }),
    ).toBe(10);
    expect(
      await prisma.birthday2026RosterFinalization.findUnique({
        where: { configId: fixture.config.id },
      }),
    ).not.toBeNull();
    expect(await finalizeBirthday2026Registration(prisma, fixture.guildId, () => 1)).toEqual({
      ok: false,
      reason: "already_finalized",
    });

    const lateUser = fixture.users[10];
    if (!lateUser) throw new Error("Missing fixture late participant");
    const lateRegistration = await registerBirthday2026Participant(
      prisma,
      fixture.guildId,
      lateUser,
      new Date("2026-08-04T18:00:00Z"),
      () => 0,
    );
    expect(lateRegistration).toMatchObject({ ok: true, assigned: true });
    if (!lateRegistration.ok || !lateRegistration.assigned) {
      throw new Error("Late participant was not assigned");
    }
    expect(
      await prisma.birthday2026MemberState.findUnique({
        where: {
          configId_userId: { configId: fixture.config.id, userId: lateUser },
        },
        select: { teamConfigId: true },
      }),
    ).toEqual({ teamConfigId: lateRegistration.teamConfigId });
    expect(
      await withdrawBirthday2026Registration(
        prisma,
        fixture.guildId,
        lateUser,
        new Date("2026-08-04T18:00:00Z"),
      ),
    ).toEqual({ ok: false, reason: "already_assigned" });
  });
});
