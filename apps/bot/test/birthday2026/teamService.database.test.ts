import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  configureBirthday2026Artwork,
  configureBirthday2026Milestones,
  configureBirthday2026Persona,
} from "../../src/events/birthday2026/statusService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  createBirthday2026TeamIdentity,
  findBirthday2026Membership,
  rebalanceBirthday2026Members,
  removeBirthday2026Member,
  setBirthday2026Captain,
  setBirthday2026Tucznik,
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

const requiredItem = <T>(items: T[], index: number, label: string): T => {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing ${label} at index ${index}`);
  }
  return item;
};

const createFixture = async (userCount = 4) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const suffix = crypto.randomUUID();
  const guildId = `birthday-service-guild-${suffix}`;
  const users = Array.from(
    { length: userCount },
    (_, index) => `birthday-service-user-${index}-${suffix}`,
  );
  guildIds.push(guildId);
  userIds.push(...users);

  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({ data: users.map((id) => ({ id })) });
  const configResult = await upsertBirthday2026Config(prisma, {
    guildId,
    eventStartAt: new Date("2026-08-01T18:00:00Z"),
    eventEndAt: new Date("2026-08-08T18:00:00Z"),
    timezone: "Europe/Warsaw",
    visible: true,
    enabled: false,
  });
  if (!configResult.ok) throw new Error(configResult.reason);

  return { config: configResult.config, guildId, suffix, users };
};

const createTeam = async (
  guildId: string,
  name: string,
  roleId: string,
  color: number,
) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const result = await createBirthday2026Team(prisma, {
    guildId,
    name,
    roleId,
    color,
  });
  if (!result.ok) throw new Error(result.reason);
  return result.team;
};

databaseTests("Birthday 2026 team services", () => {
  afterAll(async () => {
    if (!prisma) return;
    await prisma.birthday2026MemberState.deleteMany({
      where: { teamConfig: { config: { guildId: { in: guildIds } } } },
    });
    await prisma.birthday2026TeamConfig.deleteMany({
      where: { config: { guildId: { in: guildIds } } },
    });
    await prisma.birthday2026Config.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.team.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("creates event-owned teams and assigns or moves a member", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(1);
    const userId = requiredItem(fixture.users, 0, "fixture user");
    const first = await createTeam(
      fixture.guildId,
      `First ${fixture.suffix}`,
      `first-role-${fixture.suffix}`,
      0xff0000,
    );
    const second = await createTeam(
      fixture.guildId,
      `Second ${fixture.suffix}`,
      `second-role-${fixture.suffix}`,
      0x00ff00,
    );
    expect(
      await createBirthday2026Team(prisma, {
        guildId: fixture.guildId,
        name: `Third ${fixture.suffix}`,
        roleId: first.roleId,
        color: 0x0000ff,
      }),
    ).toEqual({ ok: false, reason: "role_already_used" });
    expect(
      await createBirthday2026Team(prisma, {
        guildId: fixture.guildId,
        name: first.team.name,
        roleId: `third-role-${fixture.suffix}`,
        color: 0x0000ff,
      }),
    ).toEqual({ ok: false, reason: "team_already_exists" });

    const joined = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      userId,
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) throw new Error(joined.reason);
    expect(joined.previousRoleId).toBeNull();
    expect(
      await assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: first.id,
        userId,
      }),
    ).toEqual({ ok: false, reason: "already_in_team" });

    const moved = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: second.id,
      userId,
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok) throw new Error(moved.reason);
    expect(moved.previousRoleId).toBe(first.roleId);
    expect(
      (await findBirthday2026Membership(prisma, fixture.guildId, userId))?.teamConfigId,
    ).toBe(second.id);
  });

  it("requires captains to be members and protects them from move/removal", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(2);
    const captainUserId = requiredItem(fixture.users, 0, "captain fixture user");
    const tucznikUserId = requiredItem(fixture.users, 1, "Tucznik fixture user");
    const first = await createTeam(
      fixture.guildId,
      `First ${fixture.suffix}`,
      `first-role-${fixture.suffix}`,
      0xff0000,
    );
    const second = await createTeam(
      fixture.guildId,
      `Second ${fixture.suffix}`,
      `second-role-${fixture.suffix}`,
      0x00ff00,
    );

    expect(
      await setBirthday2026Captain(prisma, fixture.guildId, first.id, captainUserId),
    ).toEqual({ ok: false, reason: "captain_not_member" });

    await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      userId: captainUserId,
    });
    await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      userId: tucznikUserId,
    });
    expect(
      await setBirthday2026Captain(prisma, fixture.guildId, first.id, captainUserId),
    ).toEqual({ ok: false, reason: "identity_not_configured" });
    expect(
      await createBirthday2026TeamIdentity(prisma, fixture.guildId, first.id, {
        captainUserId,
        tucznikUserId,
      }),
    ).toMatchObject({ ok: true });
    expect(
      (
        await setBirthday2026Tucznik(
          prisma,
          fixture.guildId,
          first.id,
          captainUserId,
          captainUserId,
        )
      ).ok,
    ).toBe(true);

    expect(
      await assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: second.id,
        userId: captainUserId,
      }),
    ).toEqual({
      ok: false,
      reason: "captain_move_requires_replacement",
    });
    expect(
      await removeBirthday2026Member(prisma, fixture.guildId, captainUserId),
    ).toEqual({
      ok: false,
      reason: "captain_move_requires_replacement",
    });
  });

  it("assigns and replaces the required identities independently", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(5);
    const tucznikUserId = requiredItem(fixture.users, 0, "Tucznik fixture user");
    const replacementCaptainUserId = requiredItem(
      fixture.users,
      1,
      "replacement captain fixture user",
    );
    const replacementTucznikUserId = requiredItem(
      fixture.users,
      2,
      "replacement Tucznik fixture user",
    );
    const otherTeamUserId = requiredItem(fixture.users, 3, "other team fixture user");
    const movableUserId = requiredItem(fixture.users, 4, "movable fixture user");
    const first = await createTeam(
      fixture.guildId,
      `First ${fixture.suffix}`,
      `first-role-${fixture.suffix}`,
      0xff0000,
    );
    const second = await createTeam(
      fixture.guildId,
      `Second ${fixture.suffix}`,
      `second-role-${fixture.suffix}`,
      0x00ff00,
    );

    await Promise.all([
      assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: first.id,
        userId: tucznikUserId,
      }),
      assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: first.id,
        userId: replacementCaptainUserId,
      }),
      assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: first.id,
        userId: replacementTucznikUserId,
      }),
      assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: second.id,
        userId: otherTeamUserId,
      }),
      assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: second.id,
        userId: movableUserId,
      }),
    ]);

    expect(
      await setBirthday2026Tucznik(
        prisma,
        fixture.guildId,
        first.id,
        otherTeamUserId,
        tucznikUserId,
      ),
    ).toEqual({ ok: false, reason: "tucznik_not_member" });

    const appointment = await createBirthday2026TeamIdentity(
      prisma,
      fixture.guildId,
      first.id,
      { captainUserId: replacementCaptainUserId, tucznikUserId },
    );
    expect(appointment).toMatchObject({
      ok: true,
      identity: {
        tucznikUserId,
        captainUserId: replacementCaptainUserId,
      },
    });
    expect(
      await createBirthday2026TeamIdentity(prisma, fixture.guildId, first.id, {
        captainUserId: replacementTucznikUserId,
        tucznikUserId,
      }),
    ).toEqual({ ok: false, reason: "identity_already_configured" });

    const milestones = await configureBirthday2026Milestones(
      prisma,
      fixture.guildId,
      [10, 20, 30, 40],
    );
    if (!milestones.ok) throw new Error(milestones.reason);
    const persona = await configureBirthday2026Persona(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      title: "Kapitan Koryta",
      fallbackEmoji: "🐗",
      configuredByUserId: tucznikUserId,
      consentedAt: new Date("2026-08-01T18:00:00Z"),
    });
    if (!persona.ok) throw new Error(persona.reason);
    const artwork = await configureBirthday2026Artwork(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      milestonePosition: 0,
      imageUrl: "https://example.com/tucznik.png",
    });
    if (!artwork.ok) throw new Error(artwork.reason);

    const captainReplacement = await setBirthday2026Captain(
      prisma,
      fixture.guildId,
      first.id,
      replacementTucznikUserId,
    );
    expect(captainReplacement).toMatchObject({
      ok: true,
      identity: {
        tucznikUserId,
        captainUserId: replacementTucznikUserId,
      },
    });

    const tucznikReplacement = await setBirthday2026Tucznik(
      prisma,
      fixture.guildId,
      first.id,
      replacementCaptainUserId,
      tucznikUserId,
    );
    expect(tucznikReplacement).toMatchObject({
      ok: true,
      identity: {
        tucznikUserId: replacementCaptainUserId,
        captainUserId: replacementTucznikUserId,
      },
    });
    expect(
      await prisma.birthday2026TeamPersona.findUnique({
        where: { teamConfigId: first.id },
      }),
    ).toBeNull();
    expect(
      await prisma.birthday2026TeamArtwork.count({
        where: { teamConfigId: first.id },
      }),
    ).toBe(0);

    expect(
      await assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: second.id,
        userId: replacementCaptainUserId,
      }),
    ).toEqual({
      ok: false,
      reason: "tucznik_move_requires_replacement",
    });
    expect(
      await removeBirthday2026Member(prisma, fixture.guildId, replacementCaptainUserId),
    ).toEqual({
      ok: false,
      reason: "tucznik_move_requires_replacement",
    });

    const rebalance = await rebalanceBirthday2026Members(prisma, {
      guildId: fixture.guildId,
      activityEstimates: new Map(
        fixture.users.map((userId, index) => [userId, 100 - index * 10]),
      ),
      random: () => 0,
    });
    if (!rebalance.ok) throw new Error(rebalance.reason);
    expect(
      rebalance.plan.assignments.find(
        (assignment) => assignment.userId === replacementTucznikUserId,
      )?.teamConfigId,
    ).toBe(first.id);
    expect(
      rebalance.plan.assignments.find(
        (assignment) => assignment.userId === replacementCaptainUserId,
      )?.teamConfigId,
    ).toBe(first.id);

    expect(
      await prisma.birthday2026TeamIdentity.findUnique({
        where: { teamConfigId: first.id },
      }),
    ).toMatchObject({
      tucznikUserId: replacementCaptainUserId,
      captainUserId: replacementTucznikUserId,
    });
    expect(
      await prisma.birthday2026TeamPersona.findUnique({
        where: { teamConfigId: first.id },
      }),
    ).toBeNull();
    expect(
      await prisma.birthday2026TeamArtwork.count({
        where: { teamConfigId: first.id },
      }),
    ).toBe(0);
    expect(
      await prisma.birthday2026TucznikChange.findMany({
        where: { teamConfigId: first.id },
        orderBy: { id: "asc" },
        select: {
          previousUserId: true,
          nextUserId: true,
          changedByUserId: true,
        },
      }),
    ).toEqual([
      {
        previousUserId: tucznikUserId,
        nextUserId: replacementCaptainUserId,
        changedByUserId: tucznikUserId,
      },
    ]);
  });
  it("rebalances members atomically while pinning captains", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(5);
    const teams = await Promise.all(
      [0xff0000, 0x00ff00, 0x0000ff, 0xffff00].map((color, index) =>
        createTeam(
          fixture.guildId,
          `Team ${index} ${fixture.suffix}`,
          `role-${index}-${fixture.suffix}`,
          color,
        ),
      ),
    );
    const captainTeam = requiredItem(teams, 0, "captain team");
    const captainUserId = requiredItem(fixture.users, 0, "captain fixture user");
    const tucznikUserId = requiredItem(fixture.users, 1, "Tucznik fixture user");

    await Promise.all(
      fixture.users.map((userId) =>
        assignBirthday2026Member(prisma, {
          guildId: fixture.guildId,
          teamConfigId: captainTeam.id,
          userId,
        }),
      ),
    );
    const identityResult = await createBirthday2026TeamIdentity(
      prisma,
      fixture.guildId,
      captainTeam.id,
      { captainUserId, tucznikUserId },
    );
    if (!identityResult.ok) throw new Error(identityResult.reason);

    expect(
      await rebalanceBirthday2026Members(prisma, {
        guildId: fixture.guildId,
        activityEstimates: new Map(),
        random: () => 0,
      }),
    ).toEqual({ ok: false, reason: "invalid_activity_estimate" });

    const estimates = new Map(
      fixture.users.map((userId, index) => [userId, 100 - index * 10]),
    );
    const rebalanceResult = await rebalanceBirthday2026Members(prisma, {
      guildId: fixture.guildId,
      activityEstimates: estimates,
      random: () => 0,
    });
    if (!rebalanceResult.ok) throw new Error(rebalanceResult.reason);
    const { plan } = rebalanceResult;

    expect(
      plan.assignments.find((assignment) => assignment.userId === captainUserId)
        ?.teamConfigId,
    ).toBe(captainTeam.id);
    expect(plan.assignments).toHaveLength(5);

    const persisted = await prisma.birthday2026MemberState.findMany({
      where: { configId: fixture.config.id },
    });
    expect(persisted).toHaveLength(5);
    expect(new Set(persisted.map((member) => member.teamConfigId)).size).toBe(4);
  });
});
