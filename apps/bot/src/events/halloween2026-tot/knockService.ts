import { addMinutes } from "date-fns";

import {
  type ExtendedPrismaClient,
  type Halloween2026TotKnock,
  type Halloween2026TotPlayer,
  Prisma,
  type PrismaTransaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";

import { addBalance } from "../../economy/managers/transferManager";
import { getRequiredGuildDefaultCurrency } from "../../economy/util";
import {
  getTotDay,
  isTotEventOpen,
  TOT_HOST_COOLDOWN_MINUTES,
  TOT_ITEM_KEYS,
  TOT_ITEMS,
  TOT_KNOCK_COOLDOWN_MINUTES,
  TOT_KNOCK_EXPIRY_MINUTES,
  TOT_PAIR_COOLDOWN_MINUTES,
} from "./constants";
import type { ItemCounts } from "./outcomeTable";
import {
  resolveTotAnswer,
  type TotAnswerChoice,
  type TotAnswerResolution,
  type TotPlayerState,
} from "./resolution";

/**
 * Tworzy brakujące wiersze graczy i blokuje je w stałej kolejności,
 * żeby równoległe pukania do tych samych osób nie wpadły w deadlock.
 */
export const lockTotPlayers = async (
  tx: PrismaTransaction,
  guildId: string,
  userIds: string[],
): Promise<Map<string, Halloween2026TotPlayer>> => {
  const sorted = [...new Set(userIds)].sort();
  await tx.halloween2026TotPlayer.createMany({
    data: sorted.map((userId) => ({ guildId, userId })),
    skipDuplicates: true,
  });
  await tx.$queryRaw(Prisma.sql`
    SELECT 1
    FROM "Halloween2026TotPlayer"
    WHERE "guildId" = ${guildId} AND "userId" IN (${Prisma.join(sorted)})
    ORDER BY "userId"
    FOR UPDATE
  `);
  const players = await tx.halloween2026TotPlayer.findMany({
    where: { guildId, userId: { in: sorted } },
  });
  return new Map(players.map((player) => [player.userId, player]));
};

export const getTotItemCounts = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
): Promise<ItemCounts> => {
  const rows = await prisma.halloween2026TotInventory.findMany({ where: { guildId, userId } });
  return Object.fromEntries(rows.map((row) => [row.item, row.count]));
};

export const saveTotItemCounts = async (
  tx: PrismaTransaction,
  guildId: string,
  userId: string,
  before: ItemCounts,
  after: ItemCounts,
) => {
  for (const item of TOT_ITEM_KEYS) {
    const count = after[item] ?? 0;
    if (count === (before[item] ?? 0)) continue;
    await tx.halloween2026TotInventory.upsert({
      where: { guildId_userId_item: { guildId, userId, item } },
      create: { guildId, userId, item, count },
      update: { count },
    });
  }
};

const getTotDailyMutes = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
  now: Date,
) => {
  const limit = await prisma.halloween2026TotDailyLimit.findUnique({
    where: { guildId_userId_day: { guildId, userId, day: getTotDay(now) } },
  });
  return limit?.mutes ?? 0;
};

const saveTotDailyMutes = (
  tx: PrismaTransaction,
  guildId: string,
  userId: string,
  now: Date,
  mutes: number,
) => {
  const day = getTotDay(now);
  return tx.halloween2026TotDailyLimit.upsert({
    where: { guildId_userId_day: { guildId, userId, day } },
    create: { guildId, userId, day, mutes },
    update: { mutes },
  });
};

export const awardTotKapsel = async (
  tx: PrismaTransaction,
  guildId: string,
  userId: string,
  reason: string,
) => {
  const currency = await getRequiredGuildDefaultCurrency(tx, guildId);
  await addBalance({
    prisma: nestedTransaction(tx),
    currencyId: currency.id,
    guildId,
    toUserId: userId,
    amount: 1,
    reason,
  });
};

const minutesLater = (from: Date | null | undefined, minutes: number) =>
  from ? addMinutes(from, minutes) : null;

export type CreateTotKnockResult =
  | {
      ok: true;
      knock: Halloween2026TotKnock;
      hostHasDice: boolean;
      /** Cooldown pukającego sprzed pukania, do przywrócenia gdy DM nie dojdzie */
      previousLastKnockAt: Date | null;
    }
  | {
      ok: false;
      reason:
        | "event_closed"
        | "self_knock"
        | "knocker_doors_closed"
        | "host_doors_closed"
        | "host_busy";
    }
  | {
      ok: false;
      reason: "knocker_cooldown" | "host_cooldown" | "pair_cooldown";
      until: Date;
    };

export const createTotKnock = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    knockerId: string;
    hostId: string;
    channelId: string;
    now: Date;
    scheduleExpiry: (tx: PrismaTransaction, knock: Halloween2026TotKnock) => Promise<unknown>;
  },
): Promise<CreateTotKnockResult> =>
  prisma.$transaction(async (tx) => {
    const { guildId, knockerId, hostId, now } = input;
    if (!isTotEventOpen(now)) return { ok: false, reason: "event_closed" } as const;
    if (knockerId === hostId) return { ok: false, reason: "self_knock" } as const;

    const players = await lockTotPlayers(tx, guildId, [knockerId, hostId]);
    const knocker = players.get(knockerId);
    const host = players.get(hostId);
    if (!knocker || !host) throw new Error("Halloween 2026 players were not created");

    if (knocker.doorsClosed) return { ok: false, reason: "knocker_doors_closed" } as const;
    if (host.doorsClosed) return { ok: false, reason: "host_doors_closed" } as const;

    const knockerUntil = minutesLater(knocker.lastKnockAt, TOT_KNOCK_COOLDOWN_MINUTES);
    if (knockerUntil && knockerUntil > now) {
      return { ok: false, reason: "knocker_cooldown", until: knockerUntil } as const;
    }

    await tx.halloween2026TotKnock.updateMany({
      where: { guildId, hostId, status: "pending", expiresAt: { lte: now } },
      data: { status: "expired" },
    });
    const pending = await tx.halloween2026TotKnock.count({
      where: { guildId, hostId, status: "pending" },
    });
    if (pending > 0) return { ok: false, reason: "host_busy" } as const;

    const lastHostKnock = await tx.halloween2026TotKnock.findFirst({
      where: { guildId, hostId },
      orderBy: { createdAt: "desc" },
    });
    const hostUntil = minutesLater(lastHostKnock?.createdAt, TOT_HOST_COOLDOWN_MINUTES);
    if (hostUntil && hostUntil > now) {
      return { ok: false, reason: "host_cooldown", until: hostUntil } as const;
    }

    const lastPairKnock = await tx.halloween2026TotKnock.findFirst({
      where: { guildId, knockerId, hostId },
      orderBy: { createdAt: "desc" },
    });
    const pairUntil = minutesLater(lastPairKnock?.createdAt, TOT_PAIR_COOLDOWN_MINUTES);
    if (pairUntil && pairUntil > now) {
      return { ok: false, reason: "pair_cooldown", until: pairUntil } as const;
    }

    const knock = await tx.halloween2026TotKnock.create({
      data: {
        guildId,
        knockerId,
        hostId,
        channelId: input.channelId,
        anonymous: knocker.maskArmed,
        createdAt: now,
        expiresAt: addMinutes(now, TOT_KNOCK_EXPIRY_MINUTES),
      },
    });
    await tx.halloween2026TotPlayer.update({
      where: { guildId_userId: { guildId, userId: knockerId } },
      data: { lastKnockAt: now, maskArmed: false },
    });
    await input.scheduleExpiry(tx, knock);

    const hostItems = await getTotItemCounts(tx, guildId, hostId);

    return {
      ok: true,
      knock,
      hostHasDice: (hostItems.dice ?? 0) > 0,
      previousLastKnockAt: knocker.lastKnockAt,
    } as const;
  });

/** Wycofuje pukanie, którego nie dało się dostarczyć, i oddaje pukającemu cooldown oraz maskę */
export const cancelUndeliveredTotKnock = (
  prisma: ExtendedPrismaClient,
  knock: Halloween2026TotKnock,
  previousLastKnockAt: Date | null,
) =>
  prisma.$transaction(async (tx) => {
    const { guildId, knockerId: userId } = knock;
    // Podczas wysyłania DM gracz mógł już użyć miotły, zapukać gdzie indziej albo założyć
    // nową maskę, więc cofamy tylko to, co nadal pochodzi z tego pukania.
    const player = (await lockTotPlayers(tx, guildId, [userId])).get(userId);
    if (!player) throw new Error("Halloween 2026 player was not created");

    const deleted = await tx.halloween2026TotKnock.deleteMany({
      where: { id: knock.id, status: "pending" },
    });
    if (deleted.count === 0) return;

    const cooldownFromThisKnock = player.lastKnockAt?.getTime() === knock.createdAt.getTime();
    const rearmMask = knock.anonymous && !player.maskArmed;
    if (cooldownFromThisKnock || rearmMask) {
      await tx.halloween2026TotPlayer.update({
        where: { guildId_userId: { guildId, userId } },
        data: {
          ...(cooldownFromThisKnock ? { lastKnockAt: previousLastKnockAt } : {}),
          ...(rearmMask ? { maskArmed: true } : {}),
        },
      });
    }

    // Nowa maska jest już założona, więc zużytą przy tym pukaniu oddajemy do worka
    if (knock.anonymous && player.maskArmed) {
      const before = await getTotItemCounts(tx, guildId, userId);
      const count = before.mask ?? 0;
      if (count < TOT_ITEMS.mask.limit) {
        await saveTotItemCounts(tx, guildId, userId, before, { ...before, mask: count + 1 });
      }
    }
  });

export const attachTotKnockMessages = (
  prisma: ExtendedPrismaClient,
  knockId: number,
  data: { messageId?: string; dmChannelId?: string; dmMessageId?: string },
) => prisma.halloween2026TotKnock.update({ where: { id: knockId }, data });

const toState = (
  player: Halloween2026TotPlayer,
  items: ItemCounts,
  dailyMutes: number,
): TotPlayerState => ({
  userId: player.userId,
  candies: player.candies,
  lollipopArmed: player.lollipopArmed,
  muteImmuneUntil: player.muteImmuneUntil,
  items,
  dailyMutes,
});

const saveState = async (
  tx: PrismaTransaction,
  guildId: string,
  before: TotPlayerState,
  after: TotPlayerState,
  now: Date,
) => {
  await tx.halloween2026TotPlayer.update({
    where: { guildId_userId: { guildId, userId: after.userId } },
    data: {
      candies: after.candies,
      lollipopArmed: after.lollipopArmed,
      muteImmuneUntil: after.muteImmuneUntil,
    },
  });
  await saveTotItemCounts(tx, guildId, after.userId, before.items, after.items);
  if (before.dailyMutes !== after.dailyMutes) {
    await saveTotDailyMutes(tx, guildId, after.userId, now, after.dailyMutes);
  }
};

export type AnswerTotKnockResult =
  | { ok: true; knock: Halloween2026TotKnock; resolution: TotAnswerResolution }
  | {
      ok: false;
      reason: "knock_not_found" | "not_host" | "already_answered" | "expired" | "no_dice";
    };

export const answerTotKnock = (
  prisma: ExtendedPrismaClient,
  input: {
    knockId: number;
    userId: string;
    choice: TotAnswerChoice;
    now: Date;
    random: () => number;
  },
): Promise<AnswerTotKnockResult> =>
  prisma.$transaction(async (tx) => {
    const { now } = input;
    const [locked] = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT "id" FROM "Halloween2026TotKnock" WHERE "id" = ${input.knockId} FOR UPDATE
    `);
    if (!locked) return { ok: false, reason: "knock_not_found" } as const;
    const knock = await tx.halloween2026TotKnock.findUniqueOrThrow({
      where: { id: input.knockId },
    });
    if (knock.hostId !== input.userId) return { ok: false, reason: "not_host" } as const;
    if (knock.status === "answered") return { ok: false, reason: "already_answered" } as const;
    if (knock.status === "expired" || knock.expiresAt <= now) {
      return { ok: false, reason: "expired" } as const;
    }

    const { guildId } = knock;
    const players = await lockTotPlayers(tx, guildId, [knock.knockerId, knock.hostId]);
    const load = async (userId: string) => {
      const player = players.get(userId);
      if (!player) throw new Error("Halloween 2026 player was not created");
      return toState(
        player,
        await getTotItemCounts(tx, guildId, userId),
        await getTotDailyMutes(tx, guildId, userId, now),
      );
    };
    const knocker = await load(knock.knockerId);
    const host = await load(knock.hostId);

    const result = resolveTotAnswer({
      knocker,
      host,
      choice: input.choice,
      now,
      random: input.random,
    });
    if (!result.ok) return result;
    const { resolution } = result;

    await saveState(tx, guildId, knocker, resolution.knocker, now);
    await saveState(tx, guildId, host, resolution.host, now);
    if (resolution.kapselUserId) {
      await awardTotKapsel(
        tx,
        guildId,
        resolution.kapselUserId,
        `Cukierek albo psikus: złoty kapsel [${knock.id}]`,
      );
    }

    const outcome =
      resolution.event.type === "trick"
        ? `trick:${resolution.event.outcome}`
        : resolution.event.type;
    const answered = await tx.halloween2026TotKnock.update({
      where: { id: knock.id },
      data: {
        status: "answered",
        choice: input.choice === "treat" ? "treat" : "trick",
        outcome,
        answeredAt: now,
      },
    });

    return { ok: true, knock: answered, resolution } as const;
  });

/** Zamyka pukanie bez odpowiedzi. Zwraca pukanie tylko wtedy, gdy faktycznie wygasło. */
export const expireTotKnock = async (prisma: ExtendedPrismaClient, knockId: number, now: Date) => {
  await prisma.halloween2026TotKnock.updateMany({
    where: { id: knockId, status: "pending", expiresAt: { lte: now } },
    data: { status: "expired" },
  });
  const knock = await prisma.halloween2026TotKnock.findUnique({ where: { id: knockId } });
  return knock?.status === "expired" ? knock : null;
};
