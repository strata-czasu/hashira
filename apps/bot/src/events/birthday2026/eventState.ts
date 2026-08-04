import type { Birthday2026Config } from "@hashira/db";

const MILLISECONDS_PER_EVENT_DAY = 24 * 60 * 60 * 1000;

export const getBirthday2026EventState = (
  config: Birthday2026Config | null,
  now: Date,
) => {
  if (!config) return "not_configured";
  if (!config.visible) return "hidden";
  if (!config.enabled) return "disabled";
  if (now < config.eventStartAt) return "not_started";
  if (now >= config.eventEndAt) return "finished";
  return "open";
};

export const getBirthday2026RegistrationState = (
  config: Birthday2026Config | null,
  now: Date,
) => {
  if (!config) return "not_configured";
  if (!config.visible) return "hidden";
  if (now >= config.eventEndAt) return "closed";
  return "open";
};

export const getBirthday2026EventDayIndex = (config: Birthday2026Config, at: Date) => {
  if (at < config.eventStartAt || at >= config.eventEndAt) return null;
  return Math.floor(
    (at.getTime() - config.eventStartAt.getTime()) / MILLISECONDS_PER_EVENT_DAY,
  );
};
