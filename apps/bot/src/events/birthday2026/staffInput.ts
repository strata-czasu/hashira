const ISO_INSTANT_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i;

export const isValidTimeZone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
};

export const parseBirthday2026Instant = (input: string) => {
  const value = input.trim();
  if (!ISO_INSTANT_WITH_OFFSET.test(value)) return null;

  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) ? instant : null;
};
