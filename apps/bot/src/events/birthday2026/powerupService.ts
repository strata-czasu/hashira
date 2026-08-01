import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { addSeconds } from "date-fns";
import { lockBirthday2026Config } from "./configService";
import { getBirthday2026EventState } from "./eventState";

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;

export const configureBirthday2026Powerups = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    maxInventory: number;
    effectDurationSeconds: number;
    turboDigestionSeconds: number;
  },
) => {
  if (
    !isPositiveInteger(input.maxInventory) ||
    !isPositiveInteger(input.effectDurationSeconds) ||
    !Number.isSafeInteger(input.turboDigestionSeconds) ||
    input.turboDigestionSeconds < 0
  ) {
    return { ok: false, reason: "invalid_config" } as const;
  }

  return prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId: input.guildId },
      include: { settlement: true, teams: { select: { id: true } } },
    });
    if (!config) return { ok: false, reason: "config_not_found" } as const;
    const state = await lockBirthday2026Config(tx, config.id);
    if (state.settlement) return { ok: false, reason: "event_settled" } as const;

    const powerupConfig = await tx.birthday2026PowerupConfig.upsert({
      where: { configId: config.id },
      create: {
        configId: config.id,
        maxInventory: input.maxInventory,
        effectDurationSeconds: input.effectDurationSeconds,
        turboDigestionSeconds: input.turboDigestionSeconds,
      },
      update: {
        maxInventory: input.maxInventory,
        effectDurationSeconds: input.effectDurationSeconds,
        turboDigestionSeconds: input.turboDigestionSeconds,
      },
    });
    await tx.birthday2026TeamPowerupState.createMany({
      data: config.teams.map((team) => ({
        teamConfigId: team.id,
        configId: config.id,
        inventory: 0,
      })),
      skipDuplicates: true,
    });
    return { ok: true, config: powerupConfig } as const;
  });
};

export const awardBirthday2026Powerup = async (
  prisma: PrismaTransaction,
  teamConfigId: number,
  configId: number,
) => {
  const powerupConfig = await prisma.birthday2026PowerupConfig.findUniqueOrThrow({
    where: { configId },
  });
  await prisma.birthday2026TeamPowerupState.findUniqueOrThrow({
    where: { teamConfigId },
    select: { teamConfigId: true },
  });
  const result = await prisma.birthday2026TeamPowerupState.updateMany({
    where: { teamConfigId, inventory: { lt: powerupConfig.maxInventory } },
    data: { inventory: { increment: 1 } },
  });
  return result.count > 0;
};

export const activateBirthday2026Turbo = (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    teamConfigId: number;
    captainUserId: string;
    activatedAt: Date;
  },
) =>
  prisma.$transaction(async (tx) => {
    const teamRecord = await tx.birthday2026TeamConfig.findFirst({
      where: { id: input.teamConfigId, config: { guildId: input.guildId } },
      select: { configId: true },
    });
    if (!teamRecord) return { ok: false, reason: "team_not_found" } as const;
    await lockBirthday2026Config(tx, teamRecord.configId);
    const team = await tx.birthday2026TeamConfig.findUniqueOrThrow({
      where: { id: input.teamConfigId },
      include: {
        config: { include: { powerupConfig: true, settlement: true } },
        identity: true,
        powerupState: true,
      },
    });
    if (team.config.settlement) {
      return { ok: false, reason: "event_settled" } as const;
    }
    if (getBirthday2026EventState(team.config, input.activatedAt) !== "open") {
      return { ok: false, reason: "event_not_open" } as const;
    }
    if (team.identity?.captainUserId !== input.captainUserId) {
      return { ok: false, reason: "captain_required" } as const;
    }
    if (!team.config.powerupConfig || !team.powerupState) {
      return { ok: false, reason: "powerups_not_configured" } as const;
    }
    const active = await tx.birthday2026PowerupActivation.findFirst({
      where: {
        teamConfigId: team.id,
        activatedAt: { lte: input.activatedAt },
        expiresAt: { gt: input.activatedAt },
      },
      select: { id: true },
    });
    if (active) return { ok: false, reason: "powerup_active" } as const;

    const inventory = await tx.birthday2026TeamPowerupState.updateMany({
      where: { teamConfigId: team.id, inventory: { gt: 0 } },
      data: { inventory: { decrement: 1 } },
    });
    if (inventory.count === 0) {
      return { ok: false, reason: "inventory_empty" } as const;
    }
    const activation = await tx.birthday2026PowerupActivation.create({
      data: {
        teamConfigId: team.id,
        configId: team.configId,
        captainUserId: input.captainUserId,
        activatedAt: input.activatedAt,
        expiresAt: addSeconds(
          input.activatedAt,
          team.config.powerupConfig.effectDurationSeconds,
        ),
      },
    });
    return { ok: true, activation } as const;
  });

export const getBirthday2026PowerupStatus = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
  now: Date,
) => {
  const membership = await prisma.birthday2026MemberState.findFirst({
    where: { userId, teamConfig: { config: { guildId } } },
    select: {
      teamConfig: {
        select: {
          id: true,
          roleId: true,
          identity: { select: { captainUserId: true } },
          powerupState: { select: { inventory: true } },
          powerupActivations: {
            where: { activatedAt: { lte: now }, expiresAt: { gt: now } },
            orderBy: { activatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!membership) return null;
  if (!membership.teamConfig.powerupState) {
    throw new Error("Birthday 2026 powerups are not configured for the member's team");
  }
  return {
    ...membership,
    teamConfig: {
      ...membership.teamConfig,
      powerupState: membership.teamConfig.powerupState,
    },
  };
};
