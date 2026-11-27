// Inferred from the old bot's data: reaching level L takes 11 * L^2 experience.
const EXP_PER_LEVEL_SQUARED = 11;

export type LegacyProgress = {
  exp: number;
  level: number;
  /** Experience gained within the current level */
  current: number;
  /** Experience needed to go from the current level to the next one */
  target: number;
};

export type LegacyTier = { minLevel: number; roleId: string };

export const expForLevel = (level: number) => EXP_PER_LEVEL_SQUARED * level * level;

export const levelFromExp = (exp: number) =>
  Math.floor(Math.sqrt(Math.max(0, exp) / EXP_PER_LEVEL_SQUARED));

export const legacyProgress = (exp: number): LegacyProgress => {
  const safeExp = Math.max(0, exp);
  const level = levelFromExp(safeExp);
  const levelStart = expForLevel(level);
  return {
    exp: safeExp,
    level,
    current: safeExp - levelStart,
    target: expForLevel(level + 1) - levelStart,
  };
};

/** The highest tier the level reaches, if any */
export const tierFor = (level: number, tiers: readonly LegacyTier[]) =>
  tiers.reduce<LegacyTier | undefined>(
    (best, tier) =>
      tier.minLevel <= level && (!best || tier.minLevel > best.minLevel) ? tier : best,
    undefined,
  );

/** Role changes that leave the member holding only the role of their tier */
export const tierRoleChanges = (
  memberRoleIds: ReadonlySet<string>,
  tiers: readonly LegacyTier[],
  level: number,
) => {
  const desired = tierFor(level, tiers)?.roleId;
  return {
    add: desired && !memberRoleIds.has(desired) ? [desired] : [],
    remove: tiers
      .map((tier) => tier.roleId)
      .filter((roleId) => roleId !== desired && memberRoleIds.has(roleId)),
  };
};
