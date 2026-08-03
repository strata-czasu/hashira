import type { PrismaTransaction } from "@hashira/db";
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

export const upsertBirthday2026Config = async (
  prisma: PrismaTransaction,
  input: Birthday2026ConfigInput,
) => {
  const reason = validateBirthday2026Config(input);
  if (reason) return { ok: false, reason } as const;

  const { guildId, ...data } = input;

  const config = await prisma.birthday2026Config.upsert({
    where: { guildId },
    create: input,
    update: data,
  });

  return { ok: true, config } as const;
};
