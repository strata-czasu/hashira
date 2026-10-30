import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "bun:test";
import { addMinutes } from "date-fns";

import { PrismaClient } from "@hashira/db";

import {
  answerTotKnock,
  cancelUndeliveredTotKnock,
  createTotKnock,
  expireTotKnock,
} from "../../src/events/halloween2026-tot/knockService";
import {
  buyTotItem,
  exchangeTotCandies,
  getTotPlayerSnapshot,
  setTotDoors,
  useTotItem,
} from "../../src/events/halloween2026-tot/playerService";

const connectionString = process.env.DATABASE_TEST_URL;
const databaseTests = describe.skipIf(!connectionString);
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

const guildIds: string[] = [];
const userIds: string[] = [];

const now = new Date("2026-10-31T18:00:00Z");
const noSchedule = async () => {};

/** Pierwszy wpis tabeli psikusów to udany psikus, ostatni to złoty kapsel */
const successRoll = () => 0;
const goldenRoll = () => 0.999;

const setup = async (userCount: number) => {
  if (!prisma) throw new Error("DATABASE_TEST_URL is required");
  const suffix = crypto.randomUUID();
  const guildId = `tot-guild-${suffix}`;
  const users = Array.from({ length: userCount }, (_, index) => `tot-user-${index}-${suffix}`);
  guildIds.push(guildId);
  userIds.push(...users);
  await prisma.guild.create({ data: { id: guildId } });
  await prisma.user.createMany({ data: users.map((id) => ({ id })) });
  const currency = await prisma.currency.create({
    data: { guildId, name: "Kapsle", symbol: " kapsli", createdBy: users[0]! },
  });
  await prisma.guildSettings.create({ data: { guildId, defaultCurrencyId: currency.id } });
  return { prisma, guildId, users, currency };
};

const knock = (
  guildId: string,
  knockerId: string,
  hostId: string,
  at = now,
  scheduleExpiry: Parameters<typeof createTotKnock>[1]["scheduleExpiry"] = noSchedule,
) =>
  createTotKnock(prisma!, {
    guildId,
    knockerId,
    hostId,
    channelId: "channel",
    now: at,
    scheduleExpiry,
  });

databaseTests("Halloween 2026 trick or treat", () => {
  afterAll(async () => {
    if (!prisma) return;
    await prisma.halloween2026TotKnock.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.halloween2026TotPlayer.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.halloween2026TotDailyLimit.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.transaction.deleteMany({ where: { wallet: { guildId: { in: guildIds } } } });
    await prisma.wallet.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guildSettings.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.currency.deleteMany({ where: { guildId: { in: guildIds } } });
    await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("enforces knocker, host and pair cooldowns", async () => {
    const { guildId, users } = await setup(4);
    const [a, b, c, d] = users as [string, string, string, string];

    expect(await knock(guildId, a, a)).toEqual({ ok: false, reason: "self_knock" });
    expect(await knock(guildId, a, b, new Date("2026-10-30T12:00:00Z"))).toEqual({
      ok: false,
      reason: "event_closed",
    });

    const first = await knock(guildId, a, b);
    expect(first.ok).toBe(true);
    expect(await knock(guildId, c, b)).toEqual({ ok: false, reason: "host_busy" });
    expect(await knock(guildId, a, c)).toMatchObject({
      ok: false,
      reason: "knocker_cooldown",
      until: addMinutes(now, 30),
    });

    // Po wygaśnięciu pukania gospodarz nadal ma 15 minut spokoju
    expect(await knock(guildId, c, b, addMinutes(now, 11))).toMatchObject({
      reason: "host_cooldown",
      until: addMinutes(now, 15),
    });
    expect((await knock(guildId, c, b, addMinutes(now, 16))).ok).toBe(true);

    // Ta sama para dopiero po dwóch godzinach
    expect(await knock(guildId, a, b, addMinutes(now, 45))).toMatchObject({
      reason: "pair_cooldown",
      until: addMinutes(now, 120),
    });
    expect((await knock(guildId, a, d, addMinutes(now, 45))).ok).toBe(true);
  });

  it("respects closed doors on both sides", async () => {
    const { guildId, users } = await setup(3);
    const [a, b, c] = users as [string, string, string];
    await setTotDoors(prisma!, { guildId, userId: b, closed: true });

    expect(await knock(guildId, a, b)).toEqual({ ok: false, reason: "host_doors_closed" });
    expect(await knock(guildId, b, c)).toEqual({ ok: false, reason: "knocker_doors_closed" });
  });

  it("lets only one of many parallel knocks reach the same host", async () => {
    const { guildId, users } = await setup(6);
    const [host, ...knockers] = users as [string, ...string[]];

    const results = await Promise.all(knockers.map((knocker) => knock(guildId, knocker, host)));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.reason === "host_busy")).toHaveLength(
      knockers.length - 1,
    );
  });

  it("rolls back the scheduled expiry together with the knock", async () => {
    const { guildId, users } = await setup(2);
    const [a, b] = users as [string, string];

    await expect(
      knock(guildId, a, b, now, async () => {
        throw new Error("queue down");
      }),
    ).rejects.toThrow("queue down");

    expect(await prisma!.halloween2026TotKnock.count({ where: { guildId } })).toBe(0);
    expect((await knock(guildId, a, b)).ok).toBe(true);
  });

  it("gives back the cooldown and the mask when the DM cannot be delivered", async () => {
    const { guildId, users } = await setup(2);
    const [a, b] = users as [string, string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a } });
    await prisma!.halloween2026TotInventory.create({
      data: { guildId, userId: a, item: "mask", count: 1 },
    });
    expect(await useTotItem(prisma!, { guildId, userId: a, item: "mask", now })).toEqual({
      ok: true,
    });

    const created = await knock(guildId, a, b);
    if (!created.ok) throw new Error(created.reason);
    expect(created.knock.anonymous).toBe(true);

    await cancelUndeliveredTotKnock(prisma!, created.knock, created.previousLastKnockAt);

    const snapshot = await getTotPlayerSnapshot(prisma!, guildId, a, now);
    expect(snapshot.maskArmed).toBe(true);
    expect(snapshot.items.mask).toBe(0);
    expect(snapshot.nextKnockAt).toBeNull();
    expect((await knock(guildId, a, b)).ok).toBe(true);
  });

  it("keeps a newer cooldown when a broom and another knock happen during delivery", async () => {
    const { guildId, users } = await setup(3);
    const [a, b, c] = users as [string, string, string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a } });
    await prisma!.halloween2026TotInventory.create({
      data: { guildId, userId: a, item: "broom", count: 1 },
    });

    const failed = await knock(guildId, a, b);
    if (!failed.ok) throw new Error(failed.reason);

    // Zanim DM do B się nie powiedzie, A używa miotły i puka do C
    const later = addMinutes(now, 1);
    expect(await useTotItem(prisma!, { guildId, userId: a, item: "broom", now: later })).toEqual({
      ok: true,
    });
    expect((await knock(guildId, a, c, later)).ok).toBe(true);

    await cancelUndeliveredTotKnock(prisma!, failed.knock, failed.previousLastKnockAt);

    const snapshot = await getTotPlayerSnapshot(prisma!, guildId, a, later);
    expect(snapshot.nextKnockAt).toEqual(addMinutes(later, 30));
    expect(await prisma!.halloween2026TotKnock.count({ where: { guildId } })).toBe(1);
  });

  it("refunds the used mask when a new one was put on during delivery", async () => {
    const { guildId, users } = await setup(2);
    const [a, b] = users as [string, string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a } });
    await prisma!.halloween2026TotInventory.create({
      data: { guildId, userId: a, item: "mask", count: 2 },
    });
    await useTotItem(prisma!, { guildId, userId: a, item: "mask", now });

    const failed = await knock(guildId, a, b);
    if (!failed.ok) throw new Error(failed.reason);
    expect(failed.knock.anonymous).toBe(true);
    expect(await useTotItem(prisma!, { guildId, userId: a, item: "mask", now })).toEqual({
      ok: true,
    });

    await cancelUndeliveredTotKnock(prisma!, failed.knock, failed.previousLastKnockAt);

    const snapshot = await getTotPlayerSnapshot(prisma!, guildId, a, now);
    expect(snapshot.maskArmed).toBe(true);
    expect(snapshot.items.mask).toBe(1);
    expect(snapshot.nextKnockAt).toBeNull();
  });

  it("cancels an undelivered knock only once", async () => {
    const { guildId, users } = await setup(2);
    const [a, b] = users as [string, string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a } });
    await prisma!.halloween2026TotInventory.create({
      data: { guildId, userId: a, item: "mask", count: 1 },
    });
    await useTotItem(prisma!, { guildId, userId: a, item: "mask", now });
    const failed = await knock(guildId, a, b);
    if (!failed.ok) throw new Error(failed.reason);

    await Promise.all([
      cancelUndeliveredTotKnock(prisma!, failed.knock, failed.previousLastKnockAt),
      cancelUndeliveredTotKnock(prisma!, failed.knock, failed.previousLastKnockAt),
    ]);

    const snapshot = await getTotPlayerSnapshot(prisma!, guildId, a, now);
    expect(snapshot.maskArmed).toBe(true);
    expect(snapshot.items.mask).toBe(0);
  });

  it("answers a knock exactly once even when clicked in parallel", async () => {
    const { guildId, users } = await setup(2);
    const [a, b] = users as [string, string];
    const created = await knock(guildId, a, b);
    if (!created.ok) throw new Error(created.reason);

    const answers = await Promise.all(
      [0, 1, 2].map(() =>
        answerTotKnock(prisma!, {
          knockId: created.knock.id,
          userId: b,
          choice: "treat",
          now: addMinutes(now, 1),
          random: Math.random,
        }),
      ),
    );

    expect(answers.filter((answer) => answer.ok)).toHaveLength(1);
    expect(
      answers.filter((answer) => !answer.ok && answer.reason === "already_answered"),
    ).toHaveLength(2);
    expect((await getTotPlayerSnapshot(prisma!, guildId, a, now)).candies).toBe(1);
  });

  it("rejects answers from other users and after expiry", async () => {
    const { guildId, users } = await setup(3);
    const [a, b, c] = users as [string, string, string];
    const created = await knock(guildId, a, b);
    if (!created.ok) throw new Error(created.reason);
    const answer = (userId: string, at: Date) =>
      answerTotKnock(prisma!, {
        knockId: created.knock.id,
        userId,
        choice: "trick",
        now: at,
        random: successRoll,
      });

    expect(await answer(c, addMinutes(now, 1))).toEqual({ ok: false, reason: "not_host" });
    expect(await expireTotKnock(prisma!, created.knock.id, addMinutes(now, 5))).toBeNull();
    expect(await answer(b, addMinutes(now, 10))).toEqual({ ok: false, reason: "expired" });
    expect((await expireTotKnock(prisma!, created.knock.id, addMinutes(now, 10)))?.status).toBe(
      "expired",
    );
  });

  it("persists mute bookkeeping and consumes protective items", async () => {
    const { guildId, users } = await setup(2);
    const [a, b] = users as [string, string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: b } });
    await prisma!.halloween2026TotInventory.create({
      data: { guildId, userId: b, item: "garlic", count: 1 },
    });
    const created = await knock(guildId, a, b);
    if (!created.ok) throw new Error(created.reason);

    const answered = await answerTotKnock(prisma!, {
      knockId: created.knock.id,
      userId: b,
      choice: "trick",
      now: addMinutes(now, 1),
      random: successRoll,
    });
    if (!answered.ok) throw new Error(answered.reason);

    expect(answered.resolution.mutes).toEqual([{ kind: "blocked", userId: b }]);
    expect(answered.knock).toMatchObject({
      status: "answered",
      choice: "trick",
      outcome: "trick:success",
    });
    const host = await getTotPlayerSnapshot(prisma!, guildId, b, now);
    expect(host.items.garlic).toBe(0);
    expect((await getTotPlayerSnapshot(prisma!, guildId, a, now)).candies).toBe(1);
  });

  it("pays a golden kapsel into the default currency wallet", async () => {
    const { guildId, users, currency } = await setup(2);
    const [a, b] = users as [string, string];
    const created = await knock(guildId, a, b);
    if (!created.ok) throw new Error(created.reason);

    const answered = await answerTotKnock(prisma!, {
      knockId: created.knock.id,
      userId: b,
      choice: "trick",
      now: addMinutes(now, 1),
      random: goldenRoll,
    });
    if (!answered.ok) throw new Error(answered.reason);

    expect(answered.resolution.kapselUserId).toBe(b);
    const wallet = await prisma!.wallet.findFirstOrThrow({
      where: { guildId, userId: b, currencyId: currency.id },
    });
    expect(wallet.balance).toBe(1);
  });

  it("opens the exchange at midnight Polish time on the second day", async () => {
    const { guildId, users, currency } = await setup(1);
    const [a] = users as [string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a, candies: 10 } });
    const opensAt = new Date("2026-10-31T23:00:00Z");

    expect(
      await exchangeTotCandies(prisma!, {
        guildId,
        userId: a,
        kapsle: 1,
        now: new Date("2026-10-31T22:59:59Z"),
      }),
    ).toEqual({ ok: false, reason: "exchange_closed", opensAt });
    expect((await getTotPlayerSnapshot(prisma!, guildId, a, now)).candies).toBe(10);
    expect(
      await prisma!.wallet.count({ where: { guildId, userId: a, currencyId: currency.id } }),
    ).toBe(0);

    expect(
      (await exchangeTotCandies(prisma!, { guildId, userId: a, kapsle: 1, now: opensAt })).ok,
    ).toBe(true);
  });

  it("never spends more candies than the player has under parallel exchanges", async () => {
    const { guildId, users, currency } = await setup(1);
    const [a] = users as [string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a, candies: 50 } });
    const exchangeOpen = new Date("2026-11-01T12:00:00Z");

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        exchangeTotCandies(prisma!, { guildId, userId: a, kapsle: 3, now: exchangeOpen }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(3);
    expect(
      results.filter((result) => !result.ok && result.reason === "not_enough_candies"),
    ).toHaveLength(3);
    const wallet = await prisma!.wallet.findFirstOrThrow({
      where: { guildId, userId: a, currencyId: currency.id },
    });
    expect(wallet.balance).toBe(9);
    expect((await getTotPlayerSnapshot(prisma!, guildId, a, now)).candies).toBe(5);
  });

  it("buys items within the candy budget and the holding limit", async () => {
    const { guildId, users } = await setup(1);
    const [a] = users as [string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a, candies: 20 } });

    expect(await buyTotItem(prisma!, { guildId, userId: a, item: "mirror" })).toEqual({
      ok: true,
      candies: 12,
    });
    expect(await buyTotItem(prisma!, { guildId, userId: a, item: "mirror" })).toEqual({
      ok: true,
      candies: 4,
    });
    expect(await buyTotItem(prisma!, { guildId, userId: a, item: "mirror" })).toEqual({
      ok: false,
      reason: "item_limit",
      limit: 2,
    });
    expect(await buyTotItem(prisma!, { guildId, userId: a, item: "lollipop" })).toEqual({
      ok: false,
      reason: "not_enough_candies",
      candies: 4,
    });
  });

  it("resets the knock cooldown with a broom", async () => {
    const { guildId, users } = await setup(3);
    const [a, b, c] = users as [string, string, string];
    await prisma!.halloween2026TotPlayer.create({ data: { guildId, userId: a } });
    await prisma!.halloween2026TotInventory.create({
      data: { guildId, userId: a, item: "broom", count: 1 },
    });

    expect(await useTotItem(prisma!, { guildId, userId: a, item: "broom", now })).toEqual({
      ok: false,
      reason: "no_cooldown",
    });
    expect((await knock(guildId, a, b)).ok).toBe(true);
    expect(await useTotItem(prisma!, { guildId, userId: a, item: "broom", now })).toEqual({
      ok: true,
    });
    expect((await knock(guildId, a, c)).ok).toBe(true);
  });
});
