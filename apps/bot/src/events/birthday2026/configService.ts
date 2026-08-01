import type { Birthday2026Config, PrismaTransaction } from "@hashira/db";

export type Birthday2026ConfigInput = {
  guildId: string;
  eventStartAt: Date;
  eventEndAt: Date;
  timezone: string;
  visible: boolean;
  enabled: boolean;
  registrationEnabled: boolean;
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
  prisma: PrismaTransaction,
  input: Birthday2026ConfigInput,
) => {
  const reason = validateBirthday2026Config(input);
  if (reason) return { ok: false, reason } as const;

  const { guildId, ...data } = {
    ...input,
    timezone: input.timezone.trim(),
  };

  const config = await prisma.birthday2026Config.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });

  return { ok: true, config } as const;
};

export const setBirthday2026FeatureState = (
  prisma: PrismaTransaction,
  guildId: string,
  state: Partial<
    Pick<Birthday2026Config, "enabled" | "registrationEnabled" | "visible">
  >,
) =>
  prisma.birthday2026Config.update({
    where: { guildId },
    data: state,
  });
