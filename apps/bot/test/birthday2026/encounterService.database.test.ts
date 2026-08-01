import { afterAll, describe, expect, it } from "bun:test";
import type { PrismaTransaction } from "@hashira/db";
import { PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Client } from "discord.js";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import {
  feedBirthday2026Pig,
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "../../src/events/birthday2026/economyService";
import {
  configureBirthday2026Encounters,
  enterBirthday2026Encounter,
  reconcileBirthday2026EncounterMessage,
  spawnBirthday2026Encounter,
} from "../../src/events/birthday2026/encounterService";
import { getBirthday2026Newspaper } from "../../src/events/birthday2026/newspaperService";
import {
  activateBirthday2026Turbo,
  configureBirthday2026Powerups,
  getBirthday2026PowerupStatus,
} from "../../src/events/birthday2026/powerupService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  setBirthday2026Captain,
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
const taskIds: number[] = [];

const scheduleJob = async (
  tx: PrismaTransaction,
  type: "birthday2026EncounterExpire" | "birthday2026EncounterSpawn",
  encounterId: number,
  handleAfter: Date,
) => {
  const task = await tx.task.create({
    data: {
      identifier: `${type}:${encounterId}`,
      handleAfter,
      data: { type, data: { encounterId } },
    },
  });
  taskIds.push(task.id);
};

databaseTests("Birthday 2026 encounters", () => {
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

  it("awards one capped quick grab and parallel team thresholds", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const suffix = crypto.randomUUID();
    const guildId = `birthday-encounter-guild-${suffix}`;
    const actorUserId = `birthday-encounter-actor-${suffix}`;
    const members = [0, 1, 2, 3].map(
      (index) => `birthday-encounter-member-${index}-${suffix}`,
    );
    guildIds.push(guildId);
    userIds.push(actorUserId, ...members);
    await prisma.guild.create({ data: { id: guildId } });
    await prisma.user.createMany({
      data: [actorUserId, ...members].map((id) => ({ id })),
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
    for (const [index, userId] of members.entries()) {
      const assignment = await assignBirthday2026Member(prisma, {
        guildId,
        teamConfigId: index < 2 ? first.team.id : second.team.id,
        userId,
      });
      if (!assignment.ok) throw new Error(assignment.reason);
    }
    const economy = await setupBirthday2026Economy(prisma, {
      guildId,
      currencyName: `Encounter Pasza ${suffix}`,
      currencySymbol: `E${suffix.slice(0, 6)}`,
      digestionDelaySeconds: 60,
      createdByUserId: actorUserId,
    });
    if (!economy.ok) throw new Error(economy.reason);
    currencyIds.push(economy.currencyId);
    const encounterConfig = await configureBirthday2026Encounters(prisma, {
      guildId,
      channelId: `encounter-channel-${suffix}`,
      responseWindowSeconds: 60,
      spawnIntervalSeconds: 300,
      individualReward: 5,
      winCap: 1,
      teamThreshold: 2,
      teamReward: 7,
    });
    if (!encounterConfig.ok) throw new Error(encounterConfig.reason);
    const powerupConfig = await configureBirthday2026Powerups(prisma, {
      guildId,
      maxInventory: 1,
      effectDurationSeconds: 600,
      turboDigestionSeconds: 0,
    });
    if (!powerupConfig.ok) throw new Error(powerupConfig.reason);
    for (const [teamConfigId, captainUserId] of [
      [first.team.id, members[0]],
      [second.team.id, members[2]],
    ] as const) {
      if (!captainUserId) throw new Error("Missing captain fixture");
      const identity = await setBirthday2026Tucznik(
        prisma,
        guildId,
        teamConfigId,
        captainUserId,
        actorUserId,
      );
      if (!identity.ok) throw new Error(identity.reason);
    }
    const quick = await spawnBirthday2026Encounter(prisma, {
      guildId,
      kind: "quickGrab",
      sourceKey: `quick-${suffix}`,
      startsAt: new Date("2026-08-02T18:00:00Z"),
      scheduleJob,
    });
    if (!quick.ok) throw new Error(quick.reason);
    const quickAttempts = await Promise.all(
      members.slice(0, 2).map((userId) =>
        enterBirthday2026Encounter(prisma, {
          encounterId: quick.encounter.id,
          guildId,
          userId,
          enteredAt: new Date("2026-08-02T18:00:01Z"),
        }),
      ),
    );
    expect(quickAttempts.filter((result) => result.ok)).toHaveLength(1);
    expect(
      await prisma.birthday2026EncounterWinner.count({
        where: { encounterId: quick.encounter.id },
      }),
    ).toBe(1);
    const winner = await prisma.birthday2026EncounterWinner.findUniqueOrThrow({
      where: { encounterId: quick.encounter.id },
    });
    const winnerWallet = await prisma.wallet.findFirstOrThrow({
      where: {
        currencyId: economy.currencyId,
        default: true,
        guildId,
        userId: winner.userId,
      },
    });
    expect(winnerWallet.balance).toBe(5);

    const teamEncounter = await spawnBirthday2026Encounter(prisma, {
      guildId,
      kind: "teamThreshold",
      sourceKey: `team-${suffix}`,
      startsAt: new Date("2026-08-02T19:00:00Z"),
      scheduleJob,
    });
    if (!teamEncounter.ok) throw new Error(teamEncounter.reason);
    const teamAttempts = await Promise.all(
      members.map((userId) =>
        enterBirthday2026Encounter(prisma, {
          encounterId: teamEncounter.encounter.id,
          guildId,
          userId,
          enteredAt: new Date("2026-08-02T19:00:01Z"),
        }),
      ),
    );
    expect(
      teamAttempts.filter((result) => result.ok && result.status === "completed"),
    ).toHaveLength(2);
    expect(
      await prisma.birthday2026TeamEncounterCompletion.count({
        where: { encounterId: teamEncounter.encounter.id },
      }),
    ).toBe(2);
    expect(
      await prisma.birthday2026TeamWallet.findMany({
        where: { teamConfigId: { in: [first.team.id, second.team.id] } },
        orderBy: { teamConfigId: "asc" },
        select: { permanentWeight: true },
      }),
    ).toEqual([{ permanentWeight: 7 }, { permanentWeight: 7 }]);
    expect(
      await prisma.birthday2026TeamPowerupState.findMany({
        where: { teamConfigId: { in: [first.team.id, second.team.id] } },
        orderBy: { teamConfigId: "asc" },
        select: { inventory: true },
      }),
    ).toEqual([{ inventory: 1 }, { inventory: 1 }]);
    expect(
      await enterBirthday2026Encounter(prisma, {
        encounterId: teamEncounter.encounter.id,
        guildId,
        userId: members[0] ?? "missing",
        enteredAt: new Date("2026-08-02T19:00:02Z"),
      }),
    ).toEqual({ ok: false, reason: "already_entered" });
    expect(await prisma.task.count({ where: { id: { in: taskIds } } })).toBe(4);

    let nextMessageId = 1;
    const messages = new Map<
      string,
      { id: string; edit: (data: unknown) => unknown }
    >();
    const channel = {
      isSendable: () => true,
      messages: {
        fetch: async ({ message }: { message: string }) =>
          messages.get(message) ?? null,
      },
      send: async () => {
        const message = {
          id: `encounter-message-${nextMessageId++}`,
          edit: async () => message,
        };
        messages.set(message.id, message);
        return message;
      },
    };
    const client = {
      channels: { fetch: async () => channel },
    } as unknown as Client;
    expect(
      await reconcileBirthday2026EncounterMessage(
        client,
        prisma,
        teamEncounter.encounter.id,
        new Date("2026-08-02T19:00:02Z"),
      ),
    ).toEqual({ ok: true, recreated: true });
    const firstMessage = await prisma.birthday2026EncounterMessage.findUniqueOrThrow({
      where: { encounterId: teamEncounter.encounter.id },
    });
    messages.delete(firstMessage.messageId);
    expect(
      await reconcileBirthday2026EncounterMessage(
        client,
        prisma,
        teamEncounter.encounter.id,
        new Date("2026-08-02T19:00:03Z"),
      ),
    ).toEqual({ ok: true, recreated: true });
    expect(
      (
        await prisma.birthday2026EncounterMessage.findUniqueOrThrow({
          where: { encounterId: teamEncounter.encounter.id },
        })
      ).messageId,
    ).not.toBe(firstMessage.messageId);

    const firstCaptain = members[0];
    const replacementCaptain = members[1];
    if (!firstCaptain || !replacementCaptain) {
      throw new Error("Missing power-up fixture member");
    }
    expect(
      await activateBirthday2026Turbo(prisma, {
        guildId,
        teamConfigId: first.team.id,
        captainUserId: replacementCaptain,
        activatedAt: new Date("2026-08-02T20:00:00Z"),
      }),
    ).toEqual({ ok: false, reason: "captain_required" });
    const activation = await activateBirthday2026Turbo(prisma, {
      guildId,
      teamConfigId: first.team.id,
      captainUserId: firstCaptain,
      activatedAt: new Date("2026-08-02T20:00:00Z"),
    });
    if (!activation.ok) throw new Error(activation.reason);
    expect(
      await activateBirthday2026Turbo(prisma, {
        guildId,
        teamConfigId: first.team.id,
        captainUserId: firstCaptain,
        activatedAt: new Date("2026-08-02T20:00:01Z"),
      }),
    ).toEqual({ ok: false, reason: "powerup_active" });
    const replacement = await setBirthday2026Captain(
      prisma,
      guildId,
      first.team.id,
      replacementCaptain,
    );
    if (!replacement.ok) throw new Error(replacement.reason);
    expect(
      await prisma.birthday2026PowerupActivation.count({
        where: { teamConfigId: first.team.id },
      }),
    ).toBe(1);

    const grant = await grantBirthday2026Pasza(prisma, {
      guildId,
      userId: firstCaptain,
      amount: 10,
      sourceKey: `powerup-grant-${suffix}`,
      createdByUserId: actorUserId,
      reason: "Power-up fixture",
    });
    if (!grant.ok) throw new Error(grant.reason);
    const turboFeedAt = new Date("2026-08-02T20:00:02Z");
    const turboFeed = await feedBirthday2026Pig(prisma, {
      guildId,
      userId: firstCaptain,
      amount: 10,
      sourceKey: `powerup-feed-${suffix}`,
      acceptedAt: turboFeedAt,
      reason: "Power-up fixture",
      scheduleDigestion: async () => {},
    });
    if (!turboFeed.ok) throw new Error(turboFeed.reason);
    expect(turboFeed.batch.digestAt).toEqual(turboFeedAt);
    expect(
      (
        await getBirthday2026PowerupStatus(
          prisma,
          guildId,
          replacementCaptain,
          new Date("2026-08-02T20:11:00Z"),
        )
      )?.teamConfig.powerupActivations,
    ).toHaveLength(0);
    expect(
      await getBirthday2026Newspaper(prisma, guildId, new Date("2026-08-02T20:11:00Z")),
    ).toMatchObject({
      day: 2,
      encounters: 2,
      activations: 1,
      totalFed: 10,
      topFeeders: [{ userId: firstCaptain, amount: 10 }],
    });
  });
});
