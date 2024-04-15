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
