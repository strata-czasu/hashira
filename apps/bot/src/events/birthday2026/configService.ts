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

export const setBirthday2026FeatureState = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  state: Partial<Pick<Birthday2026Config, "enabled" | "visible">>,
) =>
  prisma.birthday2026Config.update({
    where: { guildId },
    data: state,
  });
