import type { Birthday2026Config, Prisma, PrismaTransaction } from "@hashira/db";

export type Birthday2026ConfigValidationErrorCode =
  | "invalid_event_window"
  | "invalid_timezone";

export class Birthday2026ConfigValidationError extends Error {
  constructor(
    public readonly code: Birthday2026ConfigValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "Birthday2026ConfigValidationError";
  }
}

export type Birthday2026ConfigInput = {
  guildId: string;
  eventStartAt: Date;
  eventEndAt: Date;
  timezone?: string;
  visible?: boolean;
  enabled?: boolean;
  registrationEnabled?: boolean;
};

export type Birthday2026FeatureState = Pick<
  Birthday2026Config,
  "enabled" | "registrationEnabled" | "visible"
>;

export const isValidTimeZone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
};

export const validateBirthday2026Config = (input: Birthday2026ConfigInput): void => {
  if (
    !Number.isFinite(input.eventStartAt.getTime()) ||
    !Number.isFinite(input.eventEndAt.getTime()) ||
    input.eventEndAt <= input.eventStartAt
  ) {
    throw new Birthday2026ConfigValidationError(
      "invalid_event_window",
      "Birthday 2026 must end after it starts",
    );
  }

  const timezone = (input.timezone ?? "Europe/Warsaw").trim();
  if (!timezone || !isValidTimeZone(timezone)) {
    throw new Birthday2026ConfigValidationError(
      "invalid_timezone",
      `Invalid Birthday 2026 timezone: ${timezone || "(empty)"}`,
    );
  }
};

export const findBirthday2026Config = (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<Birthday2026Config | null> =>
  prisma.birthday2026Config.findUnique({ where: { guildId } });

export const upsertBirthday2026Config = async (
  prisma: PrismaTransaction,
  input: Birthday2026ConfigInput,
): Promise<Birthday2026Config> => {
  validateBirthday2026Config(input);
  const timezone = (input.timezone ?? "Europe/Warsaw").trim();

  const update: Prisma.Birthday2026ConfigUncheckedUpdateInput = {
    eventStartAt: input.eventStartAt,
    eventEndAt: input.eventEndAt,
    timezone,
  };

  if (input.visible !== undefined) update.visible = input.visible;
  if (input.enabled !== undefined) update.enabled = input.enabled;
  if (input.registrationEnabled !== undefined) {
    update.registrationEnabled = input.registrationEnabled;
  }

  return prisma.birthday2026Config.upsert({
    where: { guildId: input.guildId },
    create: {
      guildId: input.guildId,
      eventStartAt: input.eventStartAt,
      eventEndAt: input.eventEndAt,
      timezone,
      visible: input.visible ?? false,
      enabled: input.enabled ?? false,
      registrationEnabled: input.registrationEnabled ?? false,
    },
    update,
  });
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
