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

export type Birthday2026FeatureState = Pick<
  Birthday2026Config,
  "enabled" | "registrationEnabled" | "visible"
>;

export type Birthday2026ConfigErrorReason = "invalid_event_window" | "invalid_timezone";

export type Birthday2026ConfigResult =
  | { ok: true; config: Birthday2026Config }
  | { ok: false; reason: Birthday2026ConfigErrorReason };

export const isValidTimeZone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
};

export const validateBirthday2026Config = (
  input: Birthday2026ConfigInput,
): Birthday2026ConfigErrorReason | null => {
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

export const findBirthday2026Config = (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026Config | null> =>
  prisma.birthday2026Config.findUnique({ where: { guildId } });

export const upsertBirthday2026Config = async (
  prisma: PrismaTransaction,
  input: Birthday2026ConfigInput,
): Promise<Birthday2026ConfigResult> => {
  const reason = validateBirthday2026Config(input);
  if (reason) return { ok: false, reason };

  const config = await prisma.birthday2026Config.upsert({
    where: { guildId: input.guildId },
    create: {
      guildId: input.guildId,
      eventStartAt: input.eventStartAt,
      eventEndAt: input.eventEndAt,
      timezone: input.timezone.trim(),
      visible: input.visible,
      enabled: input.enabled,
      registrationEnabled: input.registrationEnabled,
    },
    update: {
      eventStartAt: input.eventStartAt,
      eventEndAt: input.eventEndAt,
      timezone: input.timezone.trim(),
      visible: input.visible,
      enabled: input.enabled,
      registrationEnabled: input.registrationEnabled,
    },
  });

  return { ok: true, config };
};

export const setBirthday2026FeatureState = (
  prisma: PrismaTransaction,
  guildId: string,
  state: Partial<Birthday2026FeatureState>,
): Promise<Birthday2026Config> =>
  prisma.birthday2026Config.update({
    where: { guildId },
    data: state,
  });
