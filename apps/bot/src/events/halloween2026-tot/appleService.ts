import { addMinutes, subMinutes } from "date-fns";

import {
  type ExtendedPrismaClient,
  type Halloween2026TotApple,
  type Halloween2026TotKnock,
  Prisma,
  type PrismaTransaction,
} from "@hashira/db";

import {
  isTotAppleOpen,
  TOT_APPLE_COUNT,
  TOT_APPLE_FUSE_MINUTES,
  TOT_APPLE_RESEED_IMMUNITY_MINUTES,
} from "./constants";

export const lockTotApple = async (tx: PrismaTransaction, appleId: number) => {
  await tx.$queryRaw(Prisma.sql`
    SELECT 1 FROM "Halloween2026TotApple" WHERE "id" = ${appleId} FOR UPDATE
  `);
  return tx.halloween2026TotApple.findUnique({ where: { id: appleId } });
};

/**
 * Picks the apple a knock will carry. The caller must hold the knocker's player lock.
 * An apple cannot go straight back to the person who passed it.
 */
export const pickTotKnockApple = async (
  tx: PrismaTransaction,
  input: { guildId: string; knockerId: string; hostId: string; now: Date },
): Promise<{ ok: true; apple: Halloween2026TotApple | null } | { ok: false }> => {
  const { guildId, knockerId, hostId, now } = input;
  const held = await tx.halloween2026TotApple.findMany({
    where: {
      guildId,
      holderId: knockerId,
      bittenAt: null,
      fuseEndsAt: { gt: now },
      knocks: { none: { status: "pending", expiresAt: { gt: now } } },
    },
    orderBy: { fuseEndsAt: "asc" },
  });
  if (held.length === 0) return { ok: true, apple: null };
  const passable = held.find((apple) => apple.previousHolderId !== hostId);
  return passable ? { ok: true, apple: passable } : { ok: false };
};

/**
 * Hands a fresh apple to an active player while fewer than TOT_APPLE_COUNT are in play.
 * The caller must hold the player's lock.
 */
export const seedTotApple = async (
  tx: PrismaTransaction,
  input: { guildId: string; userId: string; channelId: string; now: Date },
) => {
  const { guildId, userId, channelId, now } = input;
  if (!isTotAppleOpen(now)) return null;

  await tx.$executeRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(hashtext(${`halloween2026-tot-apple:${guildId}`}))
  `);
  const active = await tx.halloween2026TotApple.count({ where: { guildId, bittenAt: null } });
  if (active >= TOT_APPLE_COUNT) return null;

  const recent = await tx.halloween2026TotApple.count({
    where: {
      guildId,
      holderId: userId,
      OR: [
        { bittenAt: null },
        { bittenAt: { gt: subMinutes(now, TOT_APPLE_RESEED_IMMUNITY_MINUTES) } },
      ],
    },
  });
  if (recent > 0) return null;

  return tx.halloween2026TotApple.create({
    data: {
      guildId,
      holderId: userId,
      channelId,
      receivedAt: now,
      fuseEndsAt: addMinutes(now, TOT_APPLE_FUSE_MINUTES),
    },
  });
};

/**
 * Moves the knock's apple to the host. The caller must hold both player locks.
 * Returns null when the apple bit, or was otherwise lost, before the door opened.
 */
export const passTotApple = async (
  tx: PrismaTransaction,
  knock: Halloween2026TotKnock,
  now: Date,
) => {
  if (knock.appleId === null) return null;
  const apple = await lockTotApple(tx, knock.appleId);
  if (!apple || apple.bittenAt || apple.holderId !== knock.knockerId || apple.fuseEndsAt <= now) {
    return null;
  }

  const passed = await tx.halloween2026TotApple.update({
    where: { id: apple.id },
    data: {
      holderId: knock.hostId,
      previousHolderId: knock.knockerId,
      channelId: knock.channelId,
      passes: { increment: 1 },
      receivedAt: now,
      fuseEndsAt: addMinutes(now, TOT_APPLE_FUSE_MINUTES),
    },
  });
  return { before: apple, after: passed };
};

export const findDueTotApples = (prisma: ExtendedPrismaClient, now: Date) =>
  prisma.halloween2026TotApple.findMany({
    where: { bittenAt: null, fuseEndsAt: { lte: now } },
    orderBy: { fuseEndsAt: "asc" },
    select: { id: true },
  });

export const getHeldTotApples = (prisma: ExtendedPrismaClient, guildId: string, userId: string) =>
  prisma.halloween2026TotApple.findMany({
    where: { guildId, holderId: userId, bittenAt: null },
    orderBy: { fuseEndsAt: "asc" },
  });
