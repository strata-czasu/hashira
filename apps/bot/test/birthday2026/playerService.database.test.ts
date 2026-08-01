import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient, type PrismaTransaction } from "@hashira/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "../../src/events/birthday2026/economyService";
import {
  feedBirthday2026Player,
  getBirthday2026PlayerSnapshot,
} from "../../src/events/birthday2026/playerService";
import { configureBirthday2026Persona } from "../../src/events/birthday2026/statusService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  createBirthday2026TeamIdentity,
} from "../../src/events/birthday2026/teamService";

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
  batch: { digestAt: Date; id: number },
) => {
  const task = await tx.task.create({
    data: {
      data: {
        type: "birthday2026Digest",
        data: { batchId: batch.id },
      },
      handleAfter: batch.digestAt,
      identifier: batch.id.toString(),
    },
  });
  taskIds.push(task.id);
};

const createFixture = async () => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");

  const suffix = crypto.randomUUID();
  const guildId = `birthday-player-guild-${suffix}`;
  const actorUserId = `birthday-player-actor-${suffix}`;
  const memberUserId = `birthday-player-member-${suffix}`;
  const nonMemberUserId = `birthday-player-non-member-${suffix}`;
  const tucznikUserIds = Array.from(
    { length: 4 },
    (_, index) => `birthday-player-tucznik-${index}-${suffix}`,
  );
  const captainUserIds = Array.from(
    { length: 4 },
    (_, index) => `birthday-player-captain-${index}-${suffix}`,
  );
  guildIds.push(guildId);
  userIds.push(
    actorUserId,
    memberUserId,
    nonMemberUserId,
    ...captainUserIds,
    ...tucznikUserIds,
  );

  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({
    data: [
      actorUserId,
      memberUserId,
      nonMemberUserId,
      ...captainUserIds,
      ...tucznikUserIds,
    ].map((id) => ({ id })),
  });

  const configResult = await upsertBirthday2026Config(prisma, {
    guildId,
    eventStartAt: new Date("2026-08-03T18:00:00Z"),
    eventEndAt: new Date("2026-08-10T18:00:00Z"),
    timezone: "Europe/Warsaw",
    visible: true,
    enabled: true,
  });
  if (!configResult.ok) throw new Error(configResult.reason);

  const teams = [];
  for (const [index, tucznikUserId] of tucznikUserIds.entries()) {
    const captainUserId = captainUserIds[index];
    if (!captainUserId) throw new Error("Player fixture captain is missing");

    const teamResult = await createBirthday2026Team(prisma, {
      guildId,
      name: `Team ${index + 1} ${suffix}`,
      roleId: `birthday-player-role-${index}-${suffix}`,
      color: 0xff8800 + index,
    });
    if (!teamResult.ok) throw new Error(teamResult.reason);
    teams.push(teamResult.team);

    for (const userId of [captainUserId, tucznikUserId]) {
      const assignment = await assignBirthday2026Member(prisma, {
        guildId,
        teamConfigId: teamResult.team.id,
        userId,
      });
      if (!assignment.ok) throw new Error(assignment.reason);
    }

    const identity = await createBirthday2026TeamIdentity(
      prisma,
      guildId,
      teamResult.team.id,
      { captainUserId, tucznikUserId },
    );
    if (!identity.ok) throw new Error(identity.reason);
    const persona = await configureBirthday2026Persona(prisma, {
      guildId,
      teamConfigId: teamResult.team.id,
      title: `Persona ${index + 1}`,
      fallbackEmoji: "🐗",
      configuredByUserId: actorUserId,
      consentedAt: new Date("2026-08-01T18:00:00Z"),
    });
    if (!persona.ok) throw new Error(persona.reason);
  }

  const playerTeam = teams[0];
  if (!playerTeam) throw new Error("Player fixture did not create a team");
  const memberAssignment = await assignBirthday2026Member(prisma, {
    guildId,
    teamConfigId: playerTeam.id,
    userId: memberUserId,
  });
  if (!memberAssignment.ok) throw new Error(memberAssignment.reason);

  const economy = await setupBirthday2026Economy(prisma, {
    guildId,
    currencyName: `Pasza ${suffix}`,
    currencySymbol: `P${suffix.slice(0, 6)}`,
    digestionDelaySeconds: 14_400,
    createdByUserId: actorUserId,
  });
  if (!economy.ok) throw new Error(economy.reason);
  currencyIds.push(economy.currencyId);

  const grant = await grantBirthday2026Pasza(prisma, {
    guildId,
    userId: memberUserId,
    amount: 12,
    sourceKey: `fixture-grant-${suffix}`,
    createdByUserId: actorUserId,
    reason: "Player loop fixture",
  });
  if (!grant.ok) throw new Error(grant.reason);

  return {
    guildId,
    memberUserId,
    nonMemberUserId,
    team: playerTeam,
  };
};

databaseTests("Birthday 2026 public player loop", () => {
  afterAll(async () => {
    if (!prisma) return;

    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.birthday2026TeamWalletTransaction.deleteMany({
      where: { wallet: { teamConfig: { config: { guildId: { in: guildIds } } } } },
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

  it("builds a private player snapshot and updates it after feeding", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();

    const before = await getBirthday2026PlayerSnapshot(
      prisma,
      fixture.guildId,
      fixture.memberUserId,
      new Date("2026-08-03T18:00:00Z"),
    );
    expect(before.ok).toBeTrue();
    if (!before.ok) return;
    expect(before.snapshot.balance).toBe(12);
    expect(before.snapshot.contributedPasza).toBe(0);
    expect(before.snapshot.membership?.teamConfigId).toBe(fixture.team.id);
    expect(before.snapshot.teams).toHaveLength(4);
    expect(before.snapshot.history.map((entry) => entry.source)).toEqual([
      "staffGrant",
    ]);

    const feed = await feedBirthday2026Player(prisma, {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      amount: 5,
      sourceKey: `player-feed-${crypto.randomUUID()}`,
      acceptedAt: new Date("2026-08-03T18:00:00Z"),
      reason: "Player command feed",
      scheduleDigestion,
    });
    expect(feed.ok).toBeTrue();

    const after = await getBirthday2026PlayerSnapshot(
      prisma,
      fixture.guildId,
      fixture.memberUserId,
      new Date("2026-08-03T18:01:00Z"),
    );
    expect(after.ok).toBeTrue();
    if (!after.ok) return;
    expect(after.snapshot.balance).toBe(7);
    expect(after.snapshot.contributedPasza).toBe(5);
    expect(after.snapshot.history.map((entry) => entry.source)).toEqual([
      "feed",
      "staffGrant",
    ]);
    expect(
      after.snapshot.teams.find((team) => team.id === fixture.team.id),
    ).toMatchObject({ contributorCount: 1, pendingPasza: 5 });
  });

  it("gates public feeding by readiness, event window, and membership", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    const input = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      amount: 1,
      sourceKey: `gated-feed-${crypto.randomUUID()}`,
      acceptedAt: new Date("2026-08-03T17:59:59Z"),
      reason: "Gated player feed",
      scheduleDigestion,
    };

    expect(await feedBirthday2026Player(prisma, input)).toEqual({
      ok: false,
      reason: "event_not_open",
    });

    const nonMemberSnapshot = await getBirthday2026PlayerSnapshot(
      prisma,
      fixture.guildId,
      fixture.nonMemberUserId,
      new Date("2026-08-03T18:00:00Z"),
    );
    expect(nonMemberSnapshot.ok).toBeTrue();
    if (nonMemberSnapshot.ok) {
      expect(nonMemberSnapshot.snapshot.membership).toBeNull();
    }
    expect(
      await feedBirthday2026Player(prisma, {
        ...input,
        userId: fixture.nonMemberUserId,
        sourceKey: `non-member-feed-${crypto.randomUUID()}`,
        acceptedAt: new Date("2026-08-03T18:00:00Z"),
      }),
    ).toEqual({ ok: false, reason: "member_not_found" });

    await prisma.birthday2026TeamIdentity.delete({
      where: { teamConfigId: fixture.team.id },
    });
    expect(
      await feedBirthday2026Player(prisma, {
        ...input,
        acceptedAt: new Date("2026-08-03T18:00:00Z"),
      }),
    ).toEqual({ ok: false, reason: "teams_not_ready" });
  });
});
