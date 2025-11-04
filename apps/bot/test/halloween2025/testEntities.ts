import type {
  MonsterData,
  PlayerData,
} from "../../src/events/halloween2025/combatRepository";
import {
  MONSTER_TEMPLATES,
  type MonsterTemplate,
} from "../../src/events/halloween2025/monsterData";

const createMonsterFromTemplate = (
  id: number,
  template: MonsterTemplate,
  overrides?: Partial<MonsterData>,
): MonsterData => ({
  id,
  ...template,
  baseSpeed: template.baseSpeed ?? 50,
  actions: template.actions.map((action, index) => ({
    id: index + 1,
    ...action,
  })),
  rarity: "common",
  ...overrides,
});

const TEST_TEMPLATE = {
  name: "Test Goblin",
  baseHp: 40,
  baseAttack: 6,
  baseDefense: 2,
  baseSpeed: 50,
  enabled: true,
  weight: 100,
  image: "",
  actions: [
    {
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
} satisfies MonsterTemplate;

export const createBasicMonster = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(1, TEST_TEMPLATE, overrides);

export const createWereraccoon = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(2, MONSTER_TEMPLATES.wereraccoon, overrides);

export const createFishermanGhost = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(3, MONSTER_TEMPLATES.fishermanGhost, overrides);

export const createZombieCat = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(4, MONSTER_TEMPLATES.zombieCat, overrides);

export const createHarpy = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(5, MONSTER_TEMPLATES.harpy, overrides);

export const createPossessedDoll = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(6, MONSTER_TEMPLATES.possessedDoll, overrides);

export const createSuccubus = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(7, MONSTER_TEMPLATES.succubus, overrides);

export const createCerber = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(8, MONSTER_TEMPLATES.cerber, overrides);

export const createVampire = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(9, MONSTER_TEMPLATES.vampire, overrides);

export const createHeadlessHorseman = (overrides?: Partial<MonsterData>): MonsterData =>
  createMonsterFromTemplate(10, MONSTER_TEMPLATES.headlessHorseman, overrides);

export const createBasicPlayer = (id: string): PlayerData => ({
  userId: id,
  username: `Player_${id}`,
  attemptedAt: new Date(),
  modifiers: {},
});
