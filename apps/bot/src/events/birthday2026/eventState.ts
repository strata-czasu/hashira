import type { Birthday2026Config } from "@hashira/db";

export const MILLISECONDS_PER_EVENT_DAY = 24 * 60 * 60 * 1000;
export const BIRTHDAY2026_REGISTRATION_ACTIVITY_DAYS = 28;

export type Birthday2026EventState =
  | "not_configured"
  | "hidden"
  | "disabled"
  | "not_started"
  | "open"
  | "finished";

export const getBirthday2026EventState = (config: Birthday2026Config | null, now: Date) => {
  if (!config) return "not_configured" as const;
  if (!config.visible) return "hidden" as const;
  if (!config.enabled) return "disabled" as const;
  if (now < config.eventStartAt) return "not_started" as const;
  if (now >= config.eventEndAt) return "finished" as const;
  return "open" as const;
};

export const getBirthday2026RegistrationState = (config: Birthday2026Config | null, now: Date) => {
  if (!config) return "not_configured";
  if (!config.visible) return "hidden";
  if (now >= config.eventEndAt) return "closed";
  return "open";
};

export const getBirthday2026EventDayIndex = (config: Birthday2026Config, at: Date) => {
  if (at < config.eventStartAt || at >= config.eventEndAt) return null;
  return Math.floor((at.getTime() - config.eventStartAt.getTime()) / MILLISECONDS_PER_EVENT_DAY);
};
