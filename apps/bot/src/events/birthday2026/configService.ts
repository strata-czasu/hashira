import type {
  Birthday2026Config,
  ExtendedPrismaClient,
  PrismaTransaction,
} from "@hashira/db";

export type Birthday2026ConfigInput = {
  guildId: string;
  eventStartAt: Date;
  eventEndAt: Date;
  timezone: string;
  visible: boolean;
  enabled: boolean;
};

export const isValidTimeZone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
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

export const lockBirthday2026Config = async (
  prisma: PrismaTransaction,
  configId: number,
) => {
  await prisma.$queryRaw`
    SELECT "id"
    FROM "Birthday2026Config"
    WHERE "id" = ${configId}
    FOR UPDATE
  `;
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

  const { guildId, ...data } = {
    ...input,
    timezone: input.timezone.trim(),
  };

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
  state: Partial<Pick<Birthday2026Config, "enabled" | "visible">>,
) =>
  prisma.$transaction(async (tx) => {
    const configRecord = await tx.birthday2026Config.findUnique({
      where: { guildId },
      select: { id: true },
    });
    if (!configRecord) return { ok: false, reason: "config_not_found" } as const;
    const current = await lockBirthday2026Config(tx, configRecord.id);
    if (current.settlement && state.enabled) {
      return { ok: false, reason: "event_settled" } as const;
    }
    if (state.enabled && !(await isBirthday2026Ready(tx, configRecord.id))) {
      return { ok: false, reason: "event_not_ready" } as const;
    }
    const config = await tx.birthday2026Config.update({
      where: { guildId },
      data: state,
    });
    return { ok: true, config } as const;
  });
