import { type Duration, intervalToDuration } from "date-fns";

/**
 * Parse a duration string into a duration object
 * @param duration The duration string to parse
 * @returns A duration object or null if the duration is invalid
 */
export const parseDuration = (input: string): Duration | null => {
  const trimmed = input.trim();
  const globalSign = trimmed.startsWith("-") ? -1 : 1;

  const re = /([+-]?)(\d+)\s*([smhd])/gi;
  const unitMap = {
    s: "seconds",
    m: "minutes",
    h: "hours",
    d: "days",
  } as const;

  const out: Duration = {};

  for (const [, signChar, value, unit] of trimmed.matchAll(re)) {
    if (!value || !unit) return null;
    const sign = signChar === "-" ? -1 : signChar === "+" ? 1 : globalSign;
    const key = unitMap[unit.toLowerCase() as keyof typeof unitMap];
    const val = sign * Number.parseInt(value, 10);
    if (!key || Number.isNaN(val)) return null; // parsing went wrong
    out[key] = (out[key] ?? 0) + val;
  }

  return Object.keys(out).length > 0 ? out : null;
};

export const durationToSeconds = (duration: Duration): number => {
  return (
    (duration.seconds ?? 0) +
    (duration.minutes ?? 0) * 60 +
    (duration.hours ?? 0) * 60 * 60 +
    (duration.days ?? 0) * 60 * 60 * 24 +
    (duration.weeks ?? 0) * 60 * 60 * 24 * 7 +
    (duration.months ?? 0) * 60 * 60 * 24 * 30 +
    (duration.years ?? 0) * 60 * 60 * 24 * 365
  );
};

export const durationToMilliseconds = (duration: Duration): number =>
  durationToSeconds(duration) * 1000;

export const formatDuration = (duration: Duration): string => {
  const parts = [];
  if (duration.years) parts.push(`${duration.years}y`);
  if (duration.months) parts.push(`${duration.months}mo`);
  if (duration.weeks) parts.push(`${duration.weeks}w`);
  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (duration.seconds) parts.push(`${duration.seconds}s`);

  return parts.join(" ");
};

export const randomDuration = (
  min: Duration,
  max: Duration,
  random: () => number,
): Duration => {
  const minMs = durationToMilliseconds(min);
  const maxMs = durationToMilliseconds(max);
  const randomMs = Math.floor(random() * (maxMs - minMs + 1)) + minMs;

  return intervalToDuration({ start: 0, end: randomMs });
};
