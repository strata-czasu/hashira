import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { isValidTimeZone } from "./staffInput";

export type Birthday2026ConfigInput = {
  guildId: string;
  eventStartAt: Date;
  eventEndAt: Date;
  timezone: string;
  visible: boolean;
  enabled: boolean;
};

export const validateBirthday2026Config = (input: Birthday2026ConfigInput) => {
  if (
    !Number.isFinite(input.eventStartAt.getTime()) ||
    !Number.isFinite(input.eventEndAt.getTime()) ||
    input.eventEndAt <= input.eventStartAt
  ) {
    return "invalid_event_window";
  }

  if (!input.timezone.trim() || !isValidTimeZone(input.timezone.trim())) {
    return "invalid_timezone";
  }

  return null;
};

export const findBirthday2026Config = (prisma: PrismaTransaction, guildId: string) =>
  prisma.birthday2026Config.findUnique({ where: { guildId } });

/**
 * Claims the config row for the rest of the transaction, serializing event
 * activity against settlement. The value-preserving `SET id = id` update takes
 * the same Postgres row lock as `SELECT ... FOR UPDATE`, and the follow-up read
 * sees everything committed while the claim was waiting (a fresh snapshot),
 * which is why the two steps must stay separate statements.
 */
export const claimBirthday2026Config = async (
  prisma: PrismaTransaction,
  configId: number,
) => {
  await prisma.birthday2026Config.updateMany({
    where: { id: configId },
    data: { id: configId },
  });
  return prisma.birthday2026Config.findUniqueOrThrow({
    where: { id: configId },
    select: {
      enabled: true,
      settlement: { select: { configId: true } },
    },
  });
};

export const upsertBirthday2026Config = async (
  prisma: ExtendedPrismaClient,
  input: Birthday2026ConfigInput,
) => {
  const reason = validateBirthday2026Config(input);
  if (reason) return { ok: false, reason } as const;

  const { guildId, ...data } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.birthday2026Config.findUnique({
      where: { guildId },
      select: { rosterFinalization: { select: { configId: true } } },
    });
    if (existing?.rosterFinalization) {
      return { ok: false, reason: "roster_finalized" } as const;
    }
    const config = await tx.birthday2026Config.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
    });
    return { ok: true, config } as const;
  });
};

const isBirthday2026Ready = async (prisma: PrismaTransaction, configId: number) => {
  const config = await prisma.birthday2026Config.findUniqueOrThrow({
    where: { id: configId },
    include: {
      economy: true,
      encounterConfig: true,
      milestones: true,
      powerupConfig: true,
      raidConfig: true,
      rosterFinalization: true,
      textEarning: true,
      voiceEarning: true,
      teams: {
        include: {
          identity: true,
          persona: true,
          powerupState: true,
          statusMessage: true,
          wallet: true,
        },
      },
    },
  });

  return (
    config.economy !== null &&
    config.encounterConfig !== null &&
    config.milestones.length === 4 &&
    config.powerupConfig !== null &&
    config.raidConfig !== null &&
    config.rosterFinalization !== null &&
    config.textEarning !== null &&
    config.voiceEarning !== null &&
    config.teams.length === 4 &&
    config.teams.every(
      (team) =>
        team.identity !== null &&
        team.persona !== null &&
        team.powerupState !== null &&
        team.statusMessage !== null &&
        team.wallet !== null,
    )
  );
};

export const setBirthday2026FeatureState = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  state: { enabled?: boolean; visible?: boolean },
) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.birthday2026Config.findUnique({
      where: { guildId },
      select: { id: true },
    });
    if (!existing) return { ok: false, reason: "config_not_found" } as const;
    const current = await claimBirthday2026Config(tx, existing.id);
    if (current.settlement && state.enabled) {
      return { ok: false, reason: "event_settled" } as const;
    }
    if (state.enabled && !(await isBirthday2026Ready(tx, configRecord.id))) {
      return { ok: false, reason: "event_not_ready" } as const;
    }
    const config = await tx.birthday2026Config.update({
      where: { id: existing.id },
      data: state,
    });
    return { ok: true, config } as const;
  });
