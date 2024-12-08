import type { Duration } from "date-fns";

/**
 * Parse a duration string into a duration object
 * @param duration The duration string to parse
 * @returns A duration object or null if the duration is invalid
 */
export const parseDuration = (duration: string): Duration | null => {
  const match = duration.match(/(\d+)([smhdSMHD])/);
  if (!match) return null;

  // TODO: Add support for multiple units at once
  const [, amount, unit] = match;
  switch (unit?.toLowerCase()) {
    case "s":
      return { seconds: Number(amount) };
    case "m":
      return { minutes: Number(amount) };
    case "h":
      return { hours: Number(amount) };
    case "d":
      return { days: Number(amount) };
    default:
      return null;
  }
};

export const durationToSeconds = (duration: Duration): number => {
  return (
    (duration.seconds ?? 0) +
    (duration.minutes ?? 0) * 60 +
    (duration.hours ?? 0) * 60 * 60 +
    (duration.days ?? 0) * 60 * 60 * 24
  );
};

export const durationToMilliseconds = (duration: Duration): number =>
  durationToSeconds(duration) * 1000;

export const formatDuration = (duration: Duration): string => {
  const parts = [];
  if (duration.years) parts.push(`${duration.years}y`);
  if (duration.months) parts.push(`${duration.months}mo`);
  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (duration.seconds) parts.push(`${duration.seconds}s`);

  return parts.join(" ");
};
