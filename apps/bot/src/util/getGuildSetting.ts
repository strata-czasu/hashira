/**
 * Retrieves a value from a mapping keyed by guild ID.
 * @param map Mapping from guild ID to value
 * @param guildId The guild ID to lookup
 * @returns The value for the guild or null if not found
 */
export function getGuildSetting<K extends string, V>(
  map: Record<K, V>,
  guildId: string,
): V | null {
  return map[guildId as K] ?? null;
}
