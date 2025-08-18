import type { Duration } from "date-fns";

/**
 * Parse a duration string into a duration object
 * @param duration The duration string to parse
 * @returns A duration object or null if the duration is invalid
 */
export const parseDuration = (duration: string): Duration | null => {
  // Detect a global leading sign that should apply to any units that don't have their own sign.
  const trimmed = duration.trim();
  const signMatch = trimmed.match(/^([+-])\s*/);
  const sign = signMatch && signMatch[1] === "-" ? -1 : 1;

  // Match numbers (allowing optional + or -) + optional spaces + unit (s|m|h|d) (global)
  const re = /([+-]?\d+(?:\.\d+)?)\s*([smhdSMHD])/g;
  let match: RegExpExecArray | null;

  const result: Duration = {};
  let found = false;

  // biome-ignore lint/suspicious/noAssignInExpressions: more readable this way
  while ((match = re.exec(duration)) !== null) {
    if (!match[1] || !match[2]) continue;
    found = true;
    const amount = Number(match[1]) * sign;
    const unit = match[2].toLowerCase();

    if (Number.isNaN(amount)) continue;

    switch (unit) {
      case "s":
        result.seconds = (result.seconds ?? 0) + amount;
        break;
      case "m":
        result.minutes = (result.minutes ?? 0) + amount;
        break;
      case "h":
        result.hours = (result.hours ?? 0) + amount;
        break;
      case "d":
        result.days = (result.days ?? 0) + amount;
        break;
    }
  }

  return found ? result : null;
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
