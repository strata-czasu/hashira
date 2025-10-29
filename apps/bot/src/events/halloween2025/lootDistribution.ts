import type { CombatEvent } from "./combatLog";

export type LootRecipient = {
  userId: string;
  damageDealt: number;
  rank: number;
};

export type LootDistributionRule = {
  minParticipants: number;
  maxParticipants: number;
  drops: number;
};

export const LOOT_DISTRIBUTION_RULES: LootDistributionRule[] = [
  { minParticipants: 1, maxParticipants: 2, drops: 1 },
  { minParticipants: 3, maxParticipants: 5, drops: 2 },
  { minParticipants: 6, maxParticipants: 10, drops: 3 },
  { minParticipants: 11, maxParticipants: Number.POSITIVE_INFINITY, drops: 5 },
];

export const calculatePlayerDamage = (events: CombatEvent[]): Map<string, number> => {
  const damageMap = new Map<string, number>();

  for (const event of events) {
    // Only count attack/critical events targeting the monster
    if (
      (event.type === "attack" || event.type === "critical") &&
      event.target === "monster" &&
      event.actor !== "monster" &&
      event.value !== undefined
    ) {
      const current = damageMap.get(event.actor) || 0;
      damageMap.set(event.actor, current + event.value);
    }
  }

  return damageMap;
};

export const getLootDropCount = (participantCount: number): number => {
  const rule = LOOT_DISTRIBUTION_RULES.find(
    (r) =>
      participantCount >= r.minParticipants && participantCount <= r.maxParticipants,
  );
  return rule?.drops ?? 1;
};

export const selectLootRecipients = (
  events: CombatEvent[],
  participantCount: number,
): LootRecipient[] => {
  const damageMap = calculatePlayerDamage(events);
  const dropCount = getLootDropCount(participantCount);

  const sorted = Array.from(damageMap.entries()).sort((a, b) => b[1] - a[1]);

  return sorted.slice(0, dropCount).map(([userId, damageDealt], index) => ({
    userId,
    damageDealt,
    rank: index + 1,
  }));
};
