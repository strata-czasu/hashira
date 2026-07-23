import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  assignBirthday2026Member,
  Birthday2026TeamServiceError,
  createBirthday2026Team,
  findBirthday2026Membership,
  rebalanceBirthday2026Members,
  removeBirthday2026Member,
  setBirthday2026Captain,
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
  const config = await upsertBirthday2026Config(prisma, {
    guildId,
    eventStartAt: new Date("2026-08-01T18:00:00Z"),
    eventEndAt: new Date("2026-08-08T18:00:00Z"),
    visible: true,
  });

  return { config, guildId, suffix, users };
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
    const first = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `First ${fixture.suffix}`,
      roleId: `first-role-${fixture.suffix}`,
      color: 0xff0000,
    });
    const second = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `Second ${fixture.suffix}`,
      roleId: `second-role-${fixture.suffix}`,
      color: 0x00ff00,
    });

    const joined = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      userId,
    });
    expect(joined.previousTeamConfigId).toBeNull();

    const moved = await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: second.id,
      userId,
    });
    expect(moved.previousTeamConfigId).toBe(first.id);
    expect(
      (await findBirthday2026Membership(prisma, fixture.guildId, userId))?.teamConfigId,
    ).toBe(second.id);
  });

  it("requires captains to be members and protects them from move/removal", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(2);
    const captainUserId = requiredItem(fixture.users, 0, "captain fixture user");
    const first = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `First ${fixture.suffix}`,
      roleId: `first-role-${fixture.suffix}`,
      color: 0xff0000,
    });
    const second = await createBirthday2026Team(prisma, {
      guildId: fixture.guildId,
      name: `Second ${fixture.suffix}`,
      roleId: `second-role-${fixture.suffix}`,
      color: 0x00ff00,
    });

    await expect(
      setBirthday2026Captain(prisma, fixture.guildId, first.id, captainUserId),
    ).rejects.toMatchObject({ code: "captain_not_member" });

    await assignBirthday2026Member(prisma, {
      guildId: fixture.guildId,
      teamConfigId: first.id,
      userId: captainUserId,
    });
    await setBirthday2026Captain(prisma, fixture.guildId, first.id, captainUserId);

    await expect(
      assignBirthday2026Member(prisma, {
        guildId: fixture.guildId,
        teamConfigId: second.id,
        userId: captainUserId,
      }),
    ).rejects.toMatchObject({ code: "captain_move_requires_replacement" });
    await expect(
      removeBirthday2026Member(prisma, fixture.guildId, captainUserId),
    ).rejects.toBeInstanceOf(Birthday2026TeamServiceError);
  });

  it("rebalances members atomically while pinning captains", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(5);
    const teams = await Promise.all(
      [0xff0000, 0x00ff00, 0x0000ff, 0xffff00].map((color, index) =>
        createBirthday2026Team(prisma, {
          guildId: fixture.guildId,
          name: `Team ${index} ${fixture.suffix}`,
          roleId: `role-${index}-${fixture.suffix}`,
          color,
        }),
      ),
    );
    const captainTeam = requiredItem(teams, 0, "captain team");
    const captainUserId = requiredItem(fixture.users, 0, "captain fixture user");

    await Promise.all(
      fixture.users.map((userId) =>
        assignBirthday2026Member(prisma, {
          guildId: fixture.guildId,
          teamConfigId: captainTeam.id,
          userId,
        }),
      ),
    );
    await setBirthday2026Captain(
      prisma,
      fixture.guildId,
      captainTeam.id,
      captainUserId,
    );

    const estimates = new Map(
      fixture.users.map((userId, index) => [userId, 100 - index * 10]),
    );
    const plan = await rebalanceBirthday2026Members(prisma, {
      guildId: fixture.guildId,
      activityEstimates: estimates,
      random: () => 0,
    });

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
