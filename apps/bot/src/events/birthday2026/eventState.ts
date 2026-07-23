import type { Birthday2026Config } from "@hashira/db";

export type Birthday2026EventState =
  | "not_configured"
  | "hidden"
  | "disabled"
  | "not_started"
  | "open"
  | "finished";

export type Birthday2026RegistrationState =
  | "not_configured"
  | "hidden"
  | "closed"
  | "open";

type EventWindow = Pick<
  Birthday2026Config,
  "enabled" | "eventEndAt" | "eventStartAt" | "registrationEnabled" | "visible"
>;

export const getBirthday2026EventState = (
  config: EventWindow | null,
  now = new Date(),
): Birthday2026EventState => {
  if (!config) return "not_configured";
  if (!config.visible) return "hidden";
  if (!config.enabled) return "disabled";
  if (now < config.eventStartAt) return "not_started";
  if (now >= config.eventEndAt) return "finished";
  return "open";
};

export const getBirthday2026RegistrationState = (
  config: EventWindow | null,
  now = new Date(),
): Birthday2026RegistrationState => {
  if (!config) return "not_configured";
  if (!config.visible) return "hidden";
  if (!config.registrationEnabled || now >= config.eventStartAt) return "closed";
  return "open";
};

export const getBirthday2026EventDayIndex = (
  config: Pick<Birthday2026Config, "eventEndAt" | "eventStartAt">,
  at: Date,
): number | null => {
  if (at < config.eventStartAt || at >= config.eventEndAt) return null;
  return Math.floor((at.getTime() - config.eventStartAt.getTime()) / 86_400_000);
};
