import type {
  MonsterData,
  PlayerData,
} from "../../src/events/halloween2025/combatRepository";
import { MONSTER_TEMPLATES } from "../../src/events/halloween2025/monsterData";

export const createBasicMonster = (overrides?: Partial<MonsterData>): MonsterData => ({
  id: 1,
  name: "Test Goblin",
  baseHp: 40,
  baseAttack: 6,
  baseDefense: 2,
  baseSpeed: 50,
  image: "",
  actions: [
    {
      id: 1,
      name: "Slash",
      description: "Basic attack",
      actionType: "attack" as const,
      power: 8,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
    },
  ],
  rarity: "common",
  ...overrides,
});

export const createWereraccoon = (overrides?: Partial<MonsterData>): MonsterData => ({
  id: 2,
  ...MONSTER_TEMPLATES.wereraccoon,
  baseSpeed: MONSTER_TEMPLATES.wereraccoon.baseSpeed ?? 50,
  actions: MONSTER_TEMPLATES.wereraccoon.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

export const createFishermanGhost = (
  overrides?: Partial<MonsterData>,
): MonsterData => ({
  id: 3,
  ...MONSTER_TEMPLATES.fishermanGhost,
  baseSpeed: MONSTER_TEMPLATES.fishermanGhost.baseSpeed ?? 50,
  actions: MONSTER_TEMPLATES.fishermanGhost.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

export const createZombieCat = (overrides?: Partial<MonsterData>): MonsterData => ({
  id: 4,
  ...MONSTER_TEMPLATES.zombieCat,
  actions: MONSTER_TEMPLATES.zombieCat.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

export const createHarpy = (overrides?: Partial<MonsterData>): MonsterData => ({
  id: 5,
  ...MONSTER_TEMPLATES.harpy,
  baseSpeed: MONSTER_TEMPLATES.harpy.baseSpeed ?? 50,
  actions: MONSTER_TEMPLATES.harpy.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

export const createPossessedDoll = (overrides?: Partial<MonsterData>): MonsterData => ({
  id: 6,
  ...MONSTER_TEMPLATES.possessedDoll,
  actions: MONSTER_TEMPLATES.possessedDoll.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

export const createSuccubus = (overrides?: Partial<MonsterData>): MonsterData => ({
  id: 7,
  ...MONSTER_TEMPLATES.succubus,
  baseSpeed: MONSTER_TEMPLATES.succubus.baseSpeed ?? 50,
  actions: MONSTER_TEMPLATES.succubus.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

export const createBasicPlayer = (id: string): PlayerData => ({
  userId: id,
  username: `Player_${id}`,
  attemptedAt: new Date(),
});
