// Non-null assertions are intentional here: test code

import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Random } from "effect";

import {
  initializeCombatState,
  type PlayerAbility,
  processCombatTurn,
  simulateCombat,
} from "../../src/events/halloween2025/combatLog";
import { createBasicMonster, createBasicPlayer } from "./testEntities";

const seededRandom = (seed: number) => {
  const rng = Effect.runSync(Random.Random.pipe(Random.withSeed(seed)));
  return () => rng.nextDoubleUnsafe();
};

let random: () => number = null!;

beforeEach(() => {
  random = seededRandom(42);
});

describe("Combat System", () => {
  const createBasicAbilities = (): PlayerAbility[] => [
    {
      id: 1,
      name: "Strike",
      description: "Basic attack",
      abilityType: "attack",
      power: 10,
      cooldown: 0,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
    },
  ];

  describe("initializeCombatState", () => {
    it("should initialize combat with monster and players", () => {
      const monster = createBasicMonster();
      const players = [createBasicPlayer("user1"), createBasicPlayer("user2")];

      const state = initializeCombatState(monster, players);

      expect(state.combatants.size).toBe(3);
      expect(state.combatants.get("monster")).toBeDefined();
      expect(state.combatants.get("user1")).toBeDefined();
      expect(state.combatants.get("user2")).toBeDefined();
      expect(state.currentTurn).toBe(0);
      expect(state.isComplete).toBe(false);
    });

    it("should set correct monster stats if there are no players", () => {
      const monster = createBasicMonster({ baseHp: 40, baseAttack: 6, baseDefense: 2 });
      const state = initializeCombatState(monster, []);

      const monsterCombatant = state.combatants.get("monster");
      expect(monsterCombatant?.type).toBe("monster");
      expect(monsterCombatant?.stats.hp).toBe(40);
      expect(monsterCombatant?.stats.maxHp).toBe(40);
      expect(monsterCombatant?.stats.attack).toBe(6);
      expect(monsterCombatant?.stats.defense).toBe(2);
    });

    it("should create turn order based on speed", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      expect(state.turnOrder).toEqual(["monster", "user1", "user2"]);
    });
  });

  describe("simulateCombat", () => {
    it("should capture a weak monster and record combat events", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      const result = simulateCombat(state, createBasicAbilities(), 30, random);
      expect(result.isComplete).toBe(true);
      expect(result.result).toBe("monster_captured");
      expect(result.events.some((e) => e.type === "attack")).toBe(true);
      expect(result.events.some((e) => e.type === "turn_start")).toBe(true);
      expect(result.events.some((e) => e.type === "combat_end")).toBe(true);
    });

    it("should timeout after max turns", () => {
      const monster = { ...createBasicMonster(), baseHp: 1000, baseDefense: 50 };
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = simulateCombat(state, createBasicAbilities(), 5, random);
      expect(result.currentTurn).toBeLessThanOrEqual(5);
      if (result.isComplete && !result.combatants.get("monster")?.isDefeated) {
        expect(result.result).toBe("monster_escaped");
      }
    });

    it("should apply status effects", () => {
      const abilities: PlayerAbility[] = [
        {
          id: 1,
          name: "Poison Strike",
          description: "Attack with poison",
          abilityType: "attack",
          power: 8,
          cooldown: 0,
          canTargetPlayers: false,
          canTargetSelf: false,
          isAoe: false,
          effects: { poison: 3 },
        },
      ];

      const state = initializeCombatState(createBasicMonster(), [createBasicPlayer("user1")]);
      const result = simulateCombat(state, abilities, 20, random);

      const statusEvents = result.events.filter(
        (e) => e.type === "debuff" || e.type === "status_effect",
      );
      expect(statusEvents.length).toBeGreaterThan(0);
    });
  });

  describe("processCombatTurn", () => {
    it("should return completed state as-is and escaped state at max turns", () => {
      const state = initializeCombatState(createBasicMonster(), [createBasicPlayer("user1")]);
      const completed = processCombatTurn(
        { ...state, isComplete: true, result: "monster_captured" },
        createBasicAbilities(),
        50,
        random,
      );
      expect(completed.result).toBe("monster_captured");

      state.currentTurn = 50;
      const escaped = processCombatTurn(state, createBasicAbilities(), 50, random);
      expect(escaped.isComplete).toBe(true);
      expect(escaped.result).toBe("monster_escaped");
    });

    it("should skip defeated and stunned combatants", () => {
      const state = initializeCombatState(createBasicMonster(), [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);
      const p1 = state.combatants.get("user1")!;
      p1.isDefeated = true;
      p1.stats.hp = 0;

      const p2 = state.combatants.get("user2")!;
      p2.statusEffects.push({ type: "stun", power: 0, duration: 1, source: "monster" });

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);
      expect(result.events.some((e) => e.actor === "user1")).toBe(false);
      expect(result.events.some((e) => e.actor === "user2" && e.type === "attack")).toBe(false);
      expect(result.events.some((e) => e.message.includes("ogłuszenia"))).toBe(true);
    });

    it("should heal each player once with AOE heal ability", () => {
      const abilities: PlayerAbility[] = [
        {
          id: 2,
          name: "Group Heal",
          description: "Heal all players",
          abilityType: "heal",
          power: 15,
          cooldown: 5,
          canTargetPlayers: true,
          canTargetSelf: true,
          isAoe: true,
        },
      ];

      const state = initializeCombatState(createBasicMonster(), [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
        createBasicPlayer("user3"),
      ]);
      state.combatants.get("user1")!.stats.hp = 30;
      state.combatants.get("user2")!.stats.hp = 25;
      state.combatants.get("user3")!.stats.hp = 20;

      const result = processCombatTurn(state, abilities, 50, random);
      const healedTargets = result.events
        .filter((e) => e.type === "heal" && e.actor === "user1")
        .map((e) => e.target);
      expect(healedTargets).toEqual(["user1", "user2", "user3"]);
    });
  });
});
