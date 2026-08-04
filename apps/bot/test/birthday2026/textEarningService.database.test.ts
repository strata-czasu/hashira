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
  awardBirthday2026TextPasza,
  configureBirthday2026TextEarning,
  disableBirthday2026TextChannels,
  enableBirthday2026TextChannels,
  findBirthday2026DisabledTextChannels,
  getBirthday2026TextEarningDiagnostics,
} from "../../src/events/birthday2026/textEarningService";

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

const createFixture = async (dailyCap = 24, windowSeconds = 300) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const suffix = crypto.randomUUID();
  const guildId = `birthday-text-guild-${suffix}`;
  const actorUserId = `birthday-text-actor-${suffix}`;
  const memberUserId = `birthday-text-member-${suffix}`;
  const nonMemberUserId = `birthday-text-non-member-${suffix}`;
  guildIds.push(guildId);
  userIds.push(actorUserId, memberUserId, nonMemberUserId);

  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({
    data: [{ id: actorUserId }, { id: memberUserId }, { id: nonMemberUserId }],
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

  const teamResult = await createBirthday2026Team(prisma, {
    guildId,
    name: `Team ${suffix}`,
    roleId: `role-${suffix}`,
    color: 0xff8800,
  });
  if (!teamResult.ok) throw new Error(teamResult.reason);

  const assignment = await assignBirthday2026Member(prisma, {
    guildId,
    teamConfigId: teamResult.team.id,
    userId: memberUserId,
  });
  if (!assignment.ok) throw new Error(assignment.reason);
  await prisma.birthday2026MemberState.update({
    where: {
      configId_userId: {
        configId: configResult.config.id,
        userId: memberUserId,
      },
    },
    data: { joinedAt: new Date("2026-08-01T18:00:00Z") },
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

  const textConfig = await configureBirthday2026TextEarning(prisma, {
    guildId,
    windowSeconds,
    dailyCap,
  });
  if (!textConfig.ok) throw new Error(textConfig.reason);

  return {
    config: configResult.config,
    currencyId: economy.currencyId,
    guildId,
    memberUserId,
    nonMemberUserId,
    suffix,
  };
};

databaseTests("Birthday 2026 text earning", () => {
  afterAll(async () => {
    if (!prisma) return;

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

  it("configures text earning and manages disabled channels idempotently", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();

    expect(
      await configureBirthday2026TextEarning(prisma, {
        guildId: fixture.guildId,
        windowSeconds: 0,
        dailyCap: 24,
      }),
    ).toEqual({ ok: false, reason: "invalid_window" });
    expect(
      await configureBirthday2026TextEarning(prisma, {
        guildId: fixture.guildId,
        windowSeconds: 300,
        dailyCap: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid_daily_cap" });
    expect(
      await prisma.birthday2026TextEarningConfig.findUnique({
        where: { configId: fixture.config.id },
      }),
    ).toEqual({
      configId: fixture.config.id,
      windowSeconds: 300,
      dailyCap: 24,
    });

    expect(
      await disableBirthday2026TextChannels(prisma, fixture.guildId, [
        "disabled-channel",
        "another-disabled-channel",
      ]),
    ).toEqual({
      ok: true,
      changed: true,
      channelIds: ["disabled-channel", "another-disabled-channel"],
    });
    expect(
      await disableBirthday2026TextChannels(prisma, fixture.guildId, [
        "disabled-channel",
        "another-disabled-channel",
      ]),
    ).toEqual({
      ok: true,
      changed: false,
      channelIds: ["disabled-channel", "another-disabled-channel"],
    });
    expect(await findBirthday2026DisabledTextChannels(prisma, fixture.guildId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channelId: "disabled-channel" }),
        expect.objectContaining({ channelId: "another-disabled-channel" }),
      ]),
    );
    expect(
      await enableBirthday2026TextChannels(prisma, fixture.guildId, [
        "disabled-channel",
        "another-disabled-channel",
      ]),
    ).toEqual({
      ok: true,
      changed: true,
      channelIds: ["disabled-channel", "another-disabled-channel"],
    });
    expect(await findBirthday2026DisabledTextChannels(prisma, fixture.guildId)).toEqual(
      [],
    );
  });

  it("awards one Pasza per fixed window exactly once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    const firstWindow = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      channelId: "general",
      occurredAt: new Date("2026-08-01T18:00:30Z"),
    };

    expect(await awardBirthday2026TextPasza(prisma, firstWindow)).toMatchObject({
      ok: true,
      status: "awarded",
      eventDayIndex: 0,
      windowIndex: 0,
      dailyAwardedWindows: 1,
      walletBalance: 1,
    });
    expect(await awardBirthday2026TextPasza(prisma, firstWindow)).toMatchObject({
      ok: true,
      status: "duplicate",
      eventDayIndex: 0,
      windowIndex: 0,
      walletBalance: 1,
    });
    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...firstWindow,
        occurredAt: new Date("2026-08-01T18:04:59Z"),
      }),
    ).toMatchObject({
      ok: true,
      status: "duplicate",
      windowIndex: 0,
      walletBalance: 1,
    });
    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...firstWindow,
        occurredAt: new Date("2026-08-01T18:05:00Z"),
      }),
    ).toMatchObject({
      ok: true,
      status: "awarded",
      windowIndex: 1,
      dailyAwardedWindows: 2,
      walletBalance: 2,
    });

    expect(
      await prisma.birthday2026PersonalTransaction.count({
        where: { configId: fixture.config.id, source: "textActivity" },
      }),
    ).toBe(2);
    expect(
      await getBirthday2026TextEarningDiagnostics(prisma, fixture.guildId),
    ).toEqual({
      windowSeconds: 300,
      dailyCap: 24,
      awardedTransactions: 2,
      counterTotal: 2,
      dailyRows: 1,
      reconciled: true,
    });
    expect(
      await configureBirthday2026TextEarning(prisma, {
        guildId: fixture.guildId,
        windowSeconds: 600,
        dailyCap: 24,
      }),
    ).toEqual({ ok: false, reason: "text_earning_already_used" });
  });

  it("enforces the daily cap atomically across concurrent windows", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(2);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        awardBirthday2026TextPasza(prisma, {
          guildId: fixture.guildId,
          userId: fixture.memberUserId,
          channelId: "general",
          occurredAt: new Date(
            new Date("2026-08-01T18:00:00Z").getTime() + index * 300_000,
          ),
        }),
      ),
    );

    expect(
      results.filter((result) => result.ok && result.status === "awarded"),
    ).toHaveLength(2);
    expect(
      results.filter((result) => !result.ok && result.reason === "daily_cap_reached"),
    ).toHaveLength(8);

    const dailyState = await prisma.birthday2026DailyTextEarning.findUniqueOrThrow({
      where: {
        configId_userId_eventDayIndex: {
          configId: fixture.config.id,
          userId: fixture.memberUserId,
          eventDayIndex: 0,
        },
      },
    });
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: {
        userId: fixture.memberUserId,
        currencyId: fixture.currencyId,
      },
    });
    expect(dailyState.awardedWindows).toBe(2);
    expect(wallet.balance).toBe(2);
    expect(
      await prisma.birthday2026PersonalTransaction.count({
        where: { configId: fixture.config.id, source: "textActivity" },
      }),
    ).toBe(2);
  });

  it("awards a concurrently retried window exactly once", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    const input = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      channelId: "general",
      occurredAt: new Date("2026-08-01T18:00:00Z"),
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, () => awardBirthday2026TextPasza(prisma, input)),
    );

    expect(
      results.filter((result) => result.ok && result.status === "awarded"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.ok && result.status === "duplicate"),
    ).toHaveLength(9);

    const dailyState = await prisma.birthday2026DailyTextEarning.findUniqueOrThrow({
      where: {
        configId_userId_eventDayIndex: {
          configId: fixture.config.id,
          userId: fixture.memberUserId,
          eventDayIndex: 0,
        },
      },
    });
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: {
        userId: fixture.memberUserId,
        currencyId: fixture.currencyId,
      },
    });
    expect(dailyState.awardedWindows).toBe(1);
    expect(wallet.balance).toBe(1);
    expect(
      await prisma.birthday2026PersonalTransaction.count({
        where: { configId: fixture.config.id, source: "textActivity" },
      }),
    ).toBe(1);
  });

  it("enforces event, membership, join-time, and disabled-channel eligibility", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture();
    const input = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      channelId: "general",
      occurredAt: new Date("2026-08-01T18:00:00Z"),
    };

    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...input,
        occurredAt: new Date("2026-08-01T17:59:59Z"),
      }),
    ).toEqual({ ok: false, reason: "event_not_open" });
    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...input,
        userId: fixture.nonMemberUserId,
      }),
    ).toEqual({ ok: false, reason: "member_not_found" });

    await disableBirthday2026TextChannels(prisma, fixture.guildId, [input.channelId]);
    expect(await awardBirthday2026TextPasza(prisma, input)).toEqual({
      ok: false,
      reason: "disabled_channel",
    });
    await enableBirthday2026TextChannels(prisma, fixture.guildId, [input.channelId]);

    await prisma.birthday2026MemberState.update({
      where: {
        configId_userId: {
          configId: fixture.config.id,
          userId: fixture.memberUserId,
        },
      },
      data: { joinedAt: new Date("2026-08-01T19:00:00Z") },
    });
    expect(await awardBirthday2026TextPasza(prisma, input)).toEqual({
      ok: false,
      reason: "activity_before_join",
    });
  });

  it("resets the cap on the next event-anchored day", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const fixture = await createFixture(1);
    const baseInput = {
      guildId: fixture.guildId,
      userId: fixture.memberUserId,
      channelId: "general",
    };

    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...baseInput,
        occurredAt: new Date("2026-08-01T18:00:00Z"),
      }),
    ).toMatchObject({ ok: true, status: "awarded", eventDayIndex: 0 });
    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...baseInput,
        occurredAt: new Date("2026-08-01T18:05:00Z"),
      }),
    ).toEqual({ ok: false, reason: "daily_cap_reached" });
    expect(
      await awardBirthday2026TextPasza(prisma, {
        ...baseInput,
        occurredAt: new Date("2026-08-02T18:00:00Z"),
      }),
    ).toMatchObject({
      ok: true,
      status: "awarded",
      eventDayIndex: 1,
      dailyAwardedWindows: 1,
      walletBalance: 2,
    });
  });
});
