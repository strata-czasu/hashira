import { addMinutes } from "date-fns";

import type { ExtendedPrismaClient, Halloween2026TotItem } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";

import { addBalance } from "../../economy/managers/transferManager";
import { getRequiredGuildDefaultCurrency } from "../../economy/util";
import {
  TOT_CANDIES_PER_KAPSEL,
  TOT_EXCHANGE_START,
  TOT_ITEMS,
  TOT_KNOCK_COOLDOWN_MINUTES,
} from "./constants";
import { getTotItemCounts, lockTotPlayers, saveTotItemCounts } from "./knockService";

export type TotUsableItem = "lollipop" | "mask" | "broom";

export const getTotPlayerSnapshot = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  userId: string,
  now: Date,
) => {
  const [player, items] = await Promise.all([
    prisma.halloween2026TotPlayer.findUnique({ where: { guildId_userId: { guildId, userId } } }),
    getTotItemCounts(prisma, guildId, userId),
  ]);
  const nextKnockAt = player?.lastKnockAt
    ? addMinutes(player.lastKnockAt, TOT_KNOCK_COOLDOWN_MINUTES)
    : null;

  return {
    candies: player?.candies ?? 0,
    items,
    lollipopArmed: player?.lollipopArmed ?? false,
    maskArmed: player?.maskArmed ?? false,
    doorsClosed: player?.doorsClosed ?? false,
    nextKnockAt: nextKnockAt && nextKnockAt > now ? nextKnockAt : null,
  };
};

export type TotPlayerSnapshot = Awaited<ReturnType<typeof getTotPlayerSnapshot>>;

export const buyTotItem = (
  prisma: ExtendedPrismaClient,
  input: { guildId: string; userId: string; item: Halloween2026TotItem },
) =>
  prisma.$transaction(async (tx) => {
    const { guildId, userId, item } = input;
    const player = (await lockTotPlayers(tx, guildId, [userId])).get(userId);
    if (!player) throw new Error("Halloween 2026 player was not created");

    const before = await getTotItemCounts(tx, guildId, userId);
    const definition = TOT_ITEMS[item];
    if ((before[item] ?? 0) >= definition.limit) {
      return { ok: false, reason: "item_limit", limit: definition.limit } as const;
    }
    if (player.candies < definition.price) {
      return { ok: false, reason: "not_enough_candies", candies: player.candies } as const;
    }

    await tx.halloween2026TotPlayer.update({
      where: { guildId_userId: { guildId, userId } },
      data: { candies: { decrement: definition.price } },
    });
    await saveTotItemCounts(tx, guildId, userId, before, {
      ...before,
      [item]: (before[item] ?? 0) + 1,
    });

    return { ok: true, candies: player.candies - definition.price } as const;
  });

export const useTotItem = (
  prisma: ExtendedPrismaClient,
  input: { guildId: string; userId: string; item: TotUsableItem; now: Date },
) =>
  prisma.$transaction(async (tx) => {
    const { guildId, userId, item, now } = input;
    const player = (await lockTotPlayers(tx, guildId, [userId])).get(userId);
    if (!player) throw new Error("Halloween 2026 player was not created");

    const before = await getTotItemCounts(tx, guildId, userId);
    if ((before[item] ?? 0) <= 0) return { ok: false, reason: "no_item" } as const;

    if (item === "lollipop" && player.lollipopArmed) {
      return { ok: false, reason: "already_armed" } as const;
    }
    if (item === "mask" && player.maskArmed) {
      return { ok: false, reason: "already_armed" } as const;
    }
    if (item === "broom") {
      const nextKnockAt = player.lastKnockAt
        ? addMinutes(player.lastKnockAt, TOT_KNOCK_COOLDOWN_MINUTES)
        : null;
      if (!nextKnockAt || nextKnockAt <= now) return { ok: false, reason: "no_cooldown" } as const;
    }

    await tx.halloween2026TotPlayer.update({
      where: { guildId_userId: { guildId, userId } },
      data:
        item === "lollipop"
          ? { lollipopArmed: true }
          : item === "mask"
            ? { maskArmed: true }
            : { lastKnockAt: null },
    });
    await saveTotItemCounts(tx, guildId, userId, before, {
      ...before,
      [item]: (before[item] ?? 0) - 1,
    });

    return { ok: true } as const;
  });

export const exchangeTotCandies = (
  prisma: ExtendedPrismaClient,
  input: { guildId: string; userId: string; kapsle: number; now: Date },
) =>
  prisma.$transaction(async (tx) => {
    const { guildId, userId, kapsle, now } = input;
    if (now < TOT_EXCHANGE_START) {
      return { ok: false, reason: "exchange_closed", opensAt: TOT_EXCHANGE_START } as const;
    }
    if (!Number.isSafeInteger(kapsle) || kapsle <= 0) {
      return { ok: false, reason: "invalid_amount" } as const;
    }
    const player = (await lockTotPlayers(tx, guildId, [userId])).get(userId);
    if (!player) throw new Error("Halloween 2026 player was not created");

    const cost = kapsle * TOT_CANDIES_PER_KAPSEL;
    if (player.candies < cost) {
      return { ok: false, reason: "not_enough_candies", candies: player.candies, cost } as const;
    }

    await tx.halloween2026TotPlayer.update({
      where: { guildId_userId: { guildId, userId } },
      data: { candies: { decrement: cost } },
    });
    const currency = await getRequiredGuildDefaultCurrency(tx, guildId);
    await addBalance({
      prisma: nestedTransaction(tx),
      currencyId: currency.id,
      guildId,
      toUserId: userId,
      amount: kapsle,
      reason: "Cukierek albo psikus: wymiana cukierków",
    });

    return {
      ok: true,
      cost,
      candies: player.candies - cost,
      currencySymbol: currency.symbol,
    } as const;
  });

export const setTotDoors = (
  prisma: ExtendedPrismaClient,
  input: { guildId: string; userId: string; closed: boolean },
) =>
  prisma.halloween2026TotPlayer.upsert({
    where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
    create: { guildId: input.guildId, userId: input.userId, doorsClosed: input.closed },
    update: { doorsClosed: input.closed },
  });
