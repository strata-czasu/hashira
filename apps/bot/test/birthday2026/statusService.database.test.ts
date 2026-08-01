import { afterAll, describe, expect, it } from "bun:test";
import { PrismaClient } from "@hashira/db";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Client } from "discord.js";
import { upsertBirthday2026Config } from "../../src/events/birthday2026/configService";
import { setupBirthday2026Economy } from "../../src/events/birthday2026/economyService";
import {
  configureBirthday2026Artwork,
  configureBirthday2026Milestones,
  configureBirthday2026Persona,
  reconcileBirthday2026StatusMessage,
} from "../../src/events/birthday2026/statusService";
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

databaseTests("Birthday 2026 canonical status", () => {
  afterAll(async () => {
    if (!prisma) return;
    await prisma.birthday2026Config.deleteMany({
      where: { guildId: { in: guildIds } },
    });
    await prisma.team.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.wallet.deleteMany({ where: { currencyId: { in: currencyIds } } });
    await prisma.currency.deleteMany({ where: { id: { in: currencyIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("recovers a deleted message and announces milestones once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const suffix = crypto.randomUUID();
    const guildId = `birthday-status-guild-${suffix}`;
    const actorUserId = `birthday-status-actor-${suffix}`;
    const tucznikUserId = `birthday-status-tucznik-${suffix}`;
    guildIds.push(guildId);
    userIds.push(actorUserId, tucznikUserId);

    await prisma.guild.create({ data: { id: guildId } });
    await prisma.user.createMany({
      data: [{ id: actorUserId }, { id: tucznikUserId }],
    });
    const config = await upsertBirthday2026Config(prisma, {
      guildId,
      eventStartAt: new Date("2026-08-03T18:00:00Z"),
      eventEndAt: new Date("2026-08-10T18:00:00Z"),
      timezone: "Europe/Warsaw",
      visible: true,
      enabled: false,
    });
    if (!config.ok) throw new Error(config.reason);
    const team = await createBirthday2026Team(prisma, {
      guildId,
      name: `Status team ${suffix}`,
      roleId: `birthday-status-role-${suffix}`,
      color: 0xff8800,
    });
    if (!team.ok) throw new Error(team.reason);
    const member = await assignBirthday2026Member(prisma, {
      guildId,
      teamConfigId: team.team.id,
      userId: tucznikUserId,
    });
    if (!member.ok) throw new Error(member.reason);
    const identity = await setBirthday2026Tucznik(
      prisma,
      guildId,
      team.team.id,
      tucznikUserId,
      actorUserId,
    );
    if (!identity.ok) throw new Error(identity.reason);
    const economy = await setupBirthday2026Economy(prisma, {
      guildId,
      currencyName: `Status Pasza ${suffix}`,
      currencySymbol: `S${suffix.slice(0, 6)}`,
      digestionDelaySeconds: 14_400,
      createdByUserId: actorUserId,
    });
    if (!economy.ok) throw new Error(economy.reason);
    currencyIds.push(economy.currencyId);
    const milestones = await configureBirthday2026Milestones(
      prisma,
      guildId,
      [10, 20, 30, 40],
    );
    if (!milestones.ok) throw new Error(milestones.reason);
    const persona = await configureBirthday2026Persona(prisma, {
      guildId,
      teamConfigId: team.team.id,
      title: "Król Koryta",
      fallbackEmoji: "🐗",
      configuredByUserId: actorUserId,
      consentedAt: new Date("2026-08-01T18:00:00Z"),
    });
    if (!persona.ok) throw new Error(persona.reason);
    const artwork = await configureBirthday2026Artwork(prisma, {
      guildId,
      teamConfigId: team.team.id,
      milestonePosition: 0,
      imageUrl: "https://example.com/tucznik.png",
    });
    if (!artwork.ok) throw new Error(artwork.reason);

    let nextMessageId = 1;
    const messages = new Map<
      string,
      { id: string; edit: (data: unknown) => unknown }
    >();
    const sent: unknown[] = [];
    const channel = {
      isSendable: () => true,
      messages: {
        fetch: async ({ message }: { message: string }) =>
          messages.get(message) ?? null,
      },
      send: async (data: unknown) => {
        sent.push(data);
        const message = {
          id: `status-message-${nextMessageId++}`,
          edit: async () => message,
        };
        messages.set(message.id, message);
        return message;
      },
    };
    const client = {
      channels: { fetch: async () => channel },
    } as unknown as Client;

    const initial = await reconcileBirthday2026StatusMessage(
      client,
      prisma,
      team.team.id,
      `status-channel-${suffix}`,
    );
    expect(initial).toEqual({
      ok: true,
      completedMilestones: 0,
      recreated: true,
    });
    const firstStatus = await prisma.birthday2026StatusMessage.findUniqueOrThrow({
      where: { teamConfigId: team.team.id },
    });

    await prisma.birthday2026TeamWallet.update({
      where: { teamConfigId: team.team.id },
      data: { permanentWeight: 15 },
    });
    const milestone = await reconcileBirthday2026StatusMessage(
      client,
      prisma,
      team.team.id,
    );
    expect(milestone).toEqual({
      ok: true,
      completedMilestones: 1,
      recreated: false,
    });
    expect(
      await prisma.birthday2026TeamMilestone.count({
        where: { teamConfigId: team.team.id },
      }),
    ).toBe(1);
    expect(
      await reconcileBirthday2026StatusMessage(client, prisma, team.team.id),
    ).toEqual({ ok: true, completedMilestones: 0, recreated: false });

    messages.delete(firstStatus.messageId);
    expect(
      await reconcileBirthday2026StatusMessage(client, prisma, team.team.id),
    ).toEqual({ ok: true, completedMilestones: 0, recreated: true });
    const recovered = await prisma.birthday2026StatusMessage.findUniqueOrThrow({
      where: { teamConfigId: team.team.id },
    });
    expect(recovered.messageId).not.toBe(firstStatus.messageId);
    expect(sent).toHaveLength(3);
  });
});
