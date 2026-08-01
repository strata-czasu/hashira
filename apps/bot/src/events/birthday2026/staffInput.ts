const ISO_INSTANT_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i;
const HEX_COLOR = /^#?([0-9a-f]{6})$/i;

export const parseBirthday2026Instant = (input: string) => {
  const value = input.trim();
  if (!ISO_INSTANT_WITH_OFFSET.test(value)) return null;

  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) ? instant : null;
};

export const parseBirthday2026TeamColor = (input: string) => {
  const match = HEX_COLOR.exec(input.trim());
  const hex = match?.[1];
  return hex ? Number.parseInt(hex, 16) : null;
};
