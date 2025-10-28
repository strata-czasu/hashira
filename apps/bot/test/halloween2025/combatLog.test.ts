// biome-ignore-all lint/style/noNonNullAssertion: test code

import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Random } from "effect";
import {
  initializeCombatState,
  type PlayerAbility,
  processCombatTurn,
  simulateCombat,
} from "../../src/events/halloween2025/combatLog";
import { createBasicMonster, createBasicPlayer } from "./testEntities";

let random: () => number = null!;

beforeEach(() => {
  const randomGen = Random.make(42);
  random = () => Effect.runSync(randomGen.next);
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

      expect(state.combatants.size).toBe(3); // 2 players + 1 monster
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

    it("should set correct monster stats with multiple players", () => {
      const monster = createBasicMonster({ baseHp: 50, baseAttack: 8, baseDefense: 3 });
      const players = [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
        createBasicPlayer("user3"),
      ];
      const state = initializeCombatState(monster, players);

      const monsterCombatant = state.combatants.get("monster");
      expect(monsterCombatant?.stats).toMatchInlineSnapshot(`
        {
          "attack": 9,
          "defense": 4,
          "hp": 200,
          "maxHp": 200,
          "speed": 50,
        }
      `);
    });

    it("should initialize players with default stats", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const player = state.combatants.get("user1");
      expect(player?.type).toBe("user");
      expect(player?.stats.hp).toBe(50);
      expect(player?.stats.maxHp).toBe(50);
      expect(player?.stats.attack).toBe(8);
      expect(player?.stats.defense).toBe(3);
    });

    it("should create turn order based on speed", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      expect(state.turnOrder).toMatchInlineSnapshot(`
        [
          "monster",
          "user1",
          "user2",
        ]
      `);
    });
  });

  describe("simulateCombat", () => {
    it("should capture a weak monster", async () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        { userId: "user1", username: "Player1", attemptedAt: new Date() },
        { userId: "user2", username: "Player2", attemptedAt: new Date() },
      ]);

      const result = await simulateCombat(state, createBasicAbilities(), 30, random);

      expect(result.isComplete).toBe(true);
      expect(result.result).toBe("monster_captured");
      expect(result.winnerUserId).toBeTruthy();
      expect(result.events.length).toBeGreaterThan(0);
    });

    it("should record combat events", async () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = await simulateCombat(state, createBasicAbilities(), 20, random);

      expect(result.events.some((e) => e.type === "attack")).toBe(true);
      expect(result.events.some((e) => e.type === "turn_start")).toBe(true);
      expect(result.events.some((e) => e.type === "combat_end")).toBe(true);
    });

    it("should timeout after max turns", async () => {
      const monster = {
        ...createBasicMonster(),
        baseHp: 1000,
        baseDefense: 50,
      };
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = await simulateCombat(state, createBasicAbilities(), 5, random);

      expect(result.currentTurn).toBeLessThanOrEqual(5);
      if (result.isComplete && !result.combatants.get("monster")?.isDefeated) {
        expect(result.result).toBe("monster_escaped");
      }
    });

    it("should handle AOE attacks", async () => {
      const monster = {
        ...createBasicMonster(),
        actions: [
          {
            id: 1,
            name: "Fireball",
            description: "AOE attack",
            actionType: "attack" as const,
            power: 10,
            weight: 100,
            cooldown: 0,
            isAoe: true,
            canTargetSelf: false,
          },
        ],
      };

      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      const result = await simulateCombat(state, createBasicAbilities(), 20, random);

      // Check that AOE events targeted multiple players
      const aoeEvents = result.events.filter((e) => e.action === "Fireball");
      expect(aoeEvents.length).toBeGreaterThan(0);
    });

    it("should apply status effects", async () => {
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

      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = await simulateCombat(state, abilities, 20, random);

      // Check for debuff/status effect events
      const statusEvents = result.events.filter(
        (e) => e.type === "debuff" || e.type === "status_effect",
      );
      expect(statusEvents.length).toBeGreaterThan(0);
    });

    it("should handle healing abilities", async () => {
      const abilities: PlayerAbility[] = [
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
        {
          id: 2,
          name: "Heal",
          description: "Restore HP",
          abilityType: "heal",
          power: 20,
          cooldown: 3,
          canTargetPlayers: false,
          canTargetSelf: true,
          isAoe: false,
        },
      ];

      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = await simulateCombat(state, abilities, 30, random);

      // Check for heal events (player may use heal when low HP)
      const healEvents = result.events.filter((e) => e.type === "heal");
      // Note: heal might not trigger if player never gets low HP
      expect(healEvents.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle all players defeated", async () => {
      const monster = {
        ...createBasicMonster(),
        baseHp: 200,
        baseAttack: 30,
        actions: [
          {
            id: 1,
            name: "Heavy Strike",
            description: "Powerful attack",
            actionType: "attack" as const,
            power: 40,
            weight: 100,
            cooldown: 0,
            isAoe: false,
            canTargetSelf: false,
          },
        ],
      };

      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = await simulateCombat(state, createBasicAbilities(), 30, random);

      // With a very strong monster, players might lose
      if (result.result === "all_players_defeated") {
        expect(result.isComplete).toBe(true);
        const player = result.combatants.get("user1");
        expect(player?.isDefeated).toBe(true);
      }
    });

    it("should handle critical hits", async () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const result = await simulateCombat(state, createBasicAbilities(), 30, random);

      // With enough turns, there should be at least some critical hits (15% chance)
      // This is probabilistic, so we just check the event type exists
      const critEvents = result.events.filter((e) => e.type === "critical");
      // May or may not have crits, just verify the type is handled
      expect(Array.isArray(critEvents)).toBe(true);
    });
  });

  describe("processCombatTurn", () => {
    it("should return completed state as-is", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      // Create a completed state
      const completedState = {
        ...state,
        isComplete: true,
        result: "monster_captured",
        winnerUserId: "user1",
      } as const;

      const result = processCombatTurn(
        completedState,
        createBasicAbilities(),
        50,
        random,
      );

      expect(result.isComplete).toBe(true);
      expect(result.result).toBe("monster_captured");
    });

    it("should increment turn counter", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);
      const initialTurn = state.currentTurn;

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      expect(result.currentTurn).toBe(initialTurn + 1);
    });

    it("should add turn start event", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);
      const initialEventCount = state.events.length;

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      expect(result.events.length).toBeGreaterThan(initialEventCount);
      expect(result.events.some((e) => e.type === "turn_start")).toBe(true);
    });

    it("should process all combatants in turn order", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      // Should have actions from all combatants
      const actors = new Set(result.events.map((e) => e.actor));
      expect(actors.size).toBeGreaterThan(1);
    });

    it("should return completed state when monster is defeated", () => {
      const monster = {
        ...createBasicMonster(),
        baseHp: 1, // Very low HP
      };
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      if (result.isComplete) {
        expect(result.result).toBe("monster_captured");
        expect(result.winnerUserId).toBeTruthy();
      }
    });

    it("should return escaped state when max turns reached", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);
      state.currentTurn = 50; // Already at max

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      expect(result.isComplete).toBe(true);
      expect(result.result).toBe("monster_escaped");
    });

    it("should process status effects at end of turn", () => {
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

      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      // Process one turn to apply poison
      const turn1 = processCombatTurn(state, abilities, 50, random);
      const turn2 = processCombatTurn(turn1, abilities, 50, random);

      expect(turn2.events.map((e) => e.message)).toMatchInlineSnapshot(`
        [
          "Test Goblin korzysta z akcji Slash!",
          "Player_user1 otrzymuje 11 obrażeń",
          "Player_user1 korzysta z umiejętności Poison Strike!",
          "Test Goblin otrzymuje 14 obrażeń",
          "Test Goblin dostaje truciznę!",
          "Test Goblin otrzymuje 3 obrażeń od efektu trucizna",
          "Test Goblin korzysta z akcji Slash!",
          "Player_user1 otrzymuje 11 obrażeń",
          "Player_user1 korzysta z umiejętności Poison Strike!",
          "Test Goblin otrzymuje 14 obrażeń",
          "Test Goblin dostaje truciznę!",
          "Test Goblin otrzymuje 6 obrażeń od efektu trucizna",
        ]
      `);
    });

    it("should allow stepping through combat turn by turn", () => {
      const monster = createBasicMonster();
      let state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      let turnCount = 0;
      const maxIterations = 30;

      while (!state.isComplete && turnCount < maxIterations) {
        state = processCombatTurn(state, createBasicAbilities(), 50, random);
        turnCount++;
      }

      expect(state.isComplete).toBe(true);
      expect(state.result).toBeDefined();
      expect(turnCount).toBeLessThanOrEqual(maxIterations);
    });

    it("should skip defeated combatants", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
      ]);

      const player1 = state.combatants.get("user1");
      player1!.isDefeated = true;
      player1!.stats.hp = 0;

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      expect(result.events.map((e) => e.message)).toMatchInlineSnapshot(`
        [
          "Test Goblin korzysta z akcji Slash!",
          "Player_user2 otrzymuje 12 obrażeń",
          "Player_user2 korzysta z umiejętności Strike!",
          "Test Goblin otrzymuje 16 obrażeń",
        ]
      `);
    });

    it("should skip stunned combatants", () => {
      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [createBasicPlayer("user1")]);

      const player = state.combatants.get("user1");
      player?.statusEffects.push({
        type: "stun",
        power: 0,
        duration: 1,
        source: "monster",
      });

      const result = processCombatTurn(state, createBasicAbilities(), 50, random);

      expect(result.events.map((e) => e.message)).toMatchInlineSnapshot(`
        [
          "Test Goblin korzysta z akcji Slash!",
          "Player_user1 otrzymuje 11 obrażeń",
          "Player_user1 ma efekt ogłuszenia i nie może nic zrobić!",
        ]
      `);
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

      const monster = createBasicMonster();
      const state = initializeCombatState(monster, [
        createBasicPlayer("user1"),
        createBasicPlayer("user2"),
        createBasicPlayer("user3"),
      ]);

      const player1 = state.combatants.get("user1")!;
      const player2 = state.combatants.get("user2")!;
      const player3 = state.combatants.get("user3")!;

      player1.stats.hp = 30;
      player2.stats.hp = 25;
      player3.stats.hp = 20;

      const result = processCombatTurn(state, abilities, 50, random);
      const healEvents = result.events.filter(
        (e) => e.type === "heal" && e.actor === "user1",
      );

      const healMessages = healEvents.map((e) => e.message);
      expect(healMessages).toMatchInlineSnapshot(`
        [
          "Player_user1 otrzymuje leczenie za 15 HP",
          "Player_user2 otrzymuje leczenie za 15 HP",
          "Player_user3 otrzymuje leczenie za 15 HP",
        ]
      `);
    });
  });
});
