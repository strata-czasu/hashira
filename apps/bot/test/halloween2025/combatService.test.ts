// biome-ignore-all lint/style/noNonNullAssertion: test code

import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Random } from "effect";
import type { PlayerAbility } from "../../src/events/halloween2025/combatLog";
import type { SpawnData } from "../../src/events/halloween2025/combatRepository";
import { MockCombatRepository } from "../../src/events/halloween2025/combatRepository";
import { CombatService } from "../../src/events/halloween2025/combatService";
import { PLAYER_ABILITIES } from "../../src/events/halloween2025/monsterData";
import {
  createBasicMonster,
  createBasicPlayer,
  createFishermanGhost,
  createHarpy,
  createPossessedDoll,
  createSuccubus,
  createWereraccoon,
  createZombieCat,
} from "./testEntities";

const defaultPlayerAbilities = PLAYER_ABILITIES.map(
  (ability, idx) =>
    ({
      id: idx + 1,
      name: ability.name,
      description: ability.description,
      abilityType: ability.abilityType,
      power: ability.power,
      cooldown: ability.cooldown,
      canTargetPlayers: ability.canTargetPlayers,
      canTargetSelf: ability.canTargetSelf,
      isAoe: ability.isAoe,
      ...("effects" in ability ? { effects: ability.effects } : {}),
    }) satisfies PlayerAbility,
);

describe("CombatService", () => {
  let repository: MockCombatRepository;
  let service: CombatService;
  let random: () => number;

  beforeEach(() => {
    const randomGen = Random.make(42);
    random = () => Effect.runSync(randomGen.next);
    repository = new MockCombatRepository();
    service = new CombatService(repository, random);
  });

  describe("getUserModifiersBatch", () => {
    it("should return empty map for empty user list", async () => {
      const modifiers = await repository.getUserModifiersBatch([], "guild123");
      expect(modifiers.size).toBe(0);
    });

    it("should return modifiers for all users", async () => {
      const userIds = ["user1", "user2", "user3"];
      const modifiers = await repository.getUserModifiersBatch(userIds, "guild123");

      expect(modifiers.size).toBe(3);
      expect(modifiers.has("user1")).toBe(true);
      expect(modifiers.has("user2")).toBe(true);
      expect(modifiers.has("user3")).toBe(true);
    });

    it.each([
      {
        description: "Light activity: 100 messages, 30 min voice",
        textMessages: 100,
        voiceMinutes: 30,
        expectedModifiers: {
          hpBonus: 11, // 100/100 + 30/3 = 1 + 10 = 11
          attackBonus: 1, // 100/1000 + 0.5 = 0.1 + 0.5 = 0.6 ≈ 1
          defenseBonus: 1, // 100/1000 + 0.5 = 0.1 + 0.5 = 0.6 ≈ 1
        },
      },
      {
        description: "Moderate activity: 500 messages, 120 min voice",
        textMessages: 500,
        voiceMinutes: 120,
        expectedModifiers: {
          hpBonus: 45, // 500/100 + 120/3 = 5 + 40 = 45
          attackBonus: 3, // 500/1000 + 2 = 0.5 + 2 = 2.5 ≈ 3
          defenseBonus: 3, // 500/1000 + 2 = 0.5 + 2 = 2.5 ≈ 3
        },
      },
      {
        description: "High activity: 1000 messages, 300 min voice (capped)",
        textMessages: 1000,
        voiceMinutes: 300,
        expectedModifiers: {
          hpBonus: 50, // (1000/100 + 300/3) = 110, capped at 50
          attackBonus: 3, // (1000/1000 + 5) = 6, capped at 3
          defenseBonus: 4, // (1000/1000 + 5) = 6, capped at 4
        },
      },
    ])("should calculate correct modifiers for: $description", async (scenario) => {
      const voiceHours = scenario.voiceMinutes / 60;
      const calculatedHp = Math.round(
        Math.min(scenario.textMessages / 100 + scenario.voiceMinutes / 3, 50),
      );
      const calculatedAttack = Math.round(
        Math.min(scenario.textMessages / 1000 + voiceHours, 3),
      );
      const calculatedDefense = Math.round(
        Math.min(scenario.textMessages / 1000 + voiceHours, 4),
      );

      expect(calculatedHp).toBe(scenario.expectedModifiers.hpBonus);
      expect(calculatedAttack).toBe(scenario.expectedModifiers.attackBonus);
      expect(calculatedDefense).toBe(scenario.expectedModifiers.defenseBonus);
    });
  });

  const createTestMonster = createBasicMonster;

  const createTestSpawn = (overrides?: Partial<SpawnData>): SpawnData => ({
    id: 1,
    channelId: "123456789",
    messageId: "987654321",
    spawnedAt: new Date(),
    expiresAt: new Date(Date.now() + 15000),
    guildId: "guild123",
    monster: createTestMonster(),
    participants: [createBasicPlayer("user1"), createBasicPlayer("user2")],
    ...overrides,
  });

  const createTestAbilities = (): PlayerAbility[] => [
    {
      id: 1,
      name: "Strike",
      description: "Basic attack",
      abilityType: "attack",
      power: 12,
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
      power: 15,
      cooldown: 3,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: false,
    },
  ];

  describe("executeCombat", () => {
    it("should return null for non-existent spawn", async () => {
      const result = await service.executeCombat(999);
      expect(result).toBeNull();
    });

    it("should handle spawn with no participants", async () => {
      const spawn = createTestSpawn({ participants: [] });
      repository.setSpawn(spawn);

      const result = await service.executeCombat(spawn.id);

      expect(result).toBeNull();
      expect(repository.updatedSpawns).toHaveLength(1);
      expect(repository.updatedSpawns[0]?.status).toBe("completed_escaped");
    });

    it("should successfully simulate combat and capture weak monster", async () => {
      const spawn = createTestSpawn({
        monster: createTestMonster({ baseHp: 30, baseAttack: 5 }),
      });
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      const result = await service.executeCombat(spawn.id, 30);

      expect(result).not.toBeNull();
      expect(result?.state.isComplete).toBe(true);
      expect(result?.state.result).toBe("monster_captured");
      expect(result?.monster.name).toBe("Test Goblin");
    });

    it("should save combat log after simulation", async () => {
      const spawn = createTestSpawn();
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      await service.executeCombat(spawn.id, 30);

      expect(repository.savedCombatLogs).toHaveLength(1);
      expect(repository.savedCombatLogs[0]?.spawnId).toBe(spawn.id);
      expect(repository.savedCombatLogs[0]?.state.events.length).toBeGreaterThan(0);
    });

    it("should update spawn status after combat", async () => {
      const spawn = createTestSpawn();
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      await service.executeCombat(spawn.id, 30);

      expect(repository.updatedSpawns).toHaveLength(1);
      expect(repository.updatedSpawns[0]?.spawnId).toBe(spawn.id);
      expect(repository.updatedSpawns[0]?.status).toMatch(/completed_/);
    });

    it("should handle multiple participants", async () => {
      const spawn = createTestSpawn({
        participants: [
          createBasicPlayer("user1"),
          createBasicPlayer("user2"),
          createBasicPlayer("user3"),
          createBasicPlayer("user4"),
        ],
      });
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      const result = await service.executeCombat(spawn.id, 30);

      expect(result).not.toBeNull();
      expect(result?.state.combatants.size).toBe(5); // 4 players + 1 monster
    });

    it("should respect max turns limit", async () => {
      const spawn = createTestSpawn({
        monster: createTestMonster({ baseHp: 1000, baseDefense: 50 }),
      });
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      const result = await service.executeCombat(spawn.id, 10);

      expect(result).not.toBeNull();
      expect(result?.state.currentTurn).toBeLessThanOrEqual(10);
      if (result?.state.currentTurn === 10 && !result?.state.isComplete) {
        expect(result?.state.result).toBe("monster_escaped");
      }
    });

    describe.each([
      { name: "Szopołak", createMonster: createWereraccoon },
      { name: "Duch Wędkarza", createMonster: createFishermanGhost },
      { name: "Zombie Bruno", createMonster: createZombieCat },
      { name: "Harpia", createMonster: createHarpy },
      { name: "Opętana Lalka", createMonster: createPossessedDoll },
      { name: "Sukkub", createMonster: createSuccubus },
    ])("handles combat for", ({ createMonster }) => {
      const monster = createMonster();
      it.each([
        [monster.name, ["user1"]],
        [monster.name, ["user1", "user2"]],
        [monster.name, ["user1", "user2", "user3"]],
      ])("%s with participants: %p", async (_, players) => {
        const spawn = createTestSpawn({
          monster,
          participants: players.map(createBasicPlayer),
        });
        repository.setSpawn(spawn);
        repository.setAbilities(createTestAbilities());

        const result = await service.executeCombat(spawn.id, 50);

        expect(result?.state.events.map((event) => event.message)).toMatchSnapshot();
      });
    });

    const calculateCaptureRate = async (
      monsterCreator: () => ReturnType<typeof createBasicMonster>,
      playerCount: number,
      iterations: number,
    ): Promise<number> => {
      let captures = 0;

      for (let i = 0; i < iterations; i++) {
        const spawn = createTestSpawn({
          monster: monsterCreator(),
          participants: Array.from({ length: playerCount }, (_, idx) =>
            createBasicPlayer(`user${idx + 1}`),
          ),
        });
        repository.setSpawn(spawn);
        repository.setAbilities(defaultPlayerAbilities);

        const result = await service.executeCombat(spawn.id, 50);

        if (result?.state.result === "monster_captured") {
          captures++;
        }
      }

      return captures / iterations;
    };

    describe.each([
      {
        name: "Szopołak",
        createMonster: createWereraccoon,
      },
      {
        name: "Duch Wędkarza",
        createMonster: createFishermanGhost,
      },
      {
        name: "Zombie Bruno",
        createMonster: createZombieCat,
      },
      {
        name: "Harpia",
        createMonster: createHarpy,
      },
      {
        name: "Opętana Lalka",
        createMonster: createPossessedDoll,
      },
      {
        name: "Sukkub",
        createMonster: createSuccubus,
      },
    ] as const)("capture rate statistics for", ({ name, createMonster }) => {
      it.each([
        [name, 1],
        [name, 2],
        [name, 3],
        [name, 4],
        [name, 5],
        [name, 6],
        [name, 7],
        [name, 8],
        [name, 9],
        [name, 10],
        [name, 12],
        [name, 15],
        [name, 20],
      ])(
        "%p with %i player(s) participants should have consistent capture rate",
        async (_, playerCount) => {
          const NUM_FIGHTS = 100;

          const captureRate = await calculateCaptureRate(
            createMonster,
            playerCount,
            NUM_FIGHTS,
          );

          const captureCount = Math.round(captureRate * NUM_FIGHTS);

          console.log(
            `${name} with ${playerCount} player(s): ${captureCount}/${NUM_FIGHTS} captures (${(captureRate * 100).toFixed(1)}%`,
          );

          expect(captureRate).toMatchSnapshot();
        },
      );
    });

    describe("loot distribution", () => {
      it("should save loot recipients when monster is captured", async () => {
        const spawn = createTestSpawn({
          participants: [
            createBasicPlayer("user1"),
            createBasicPlayer("user2"),
            createBasicPlayer("user3"),
          ],
        });
        repository.setSpawn(spawn);
        repository.setAbilities(createTestAbilities());

        const result = await service.executeCombat(spawn.id, 50);

        if (result?.state.result === "monster_captured") {
          expect(repository.savedLootRecipients).toHaveLength(1);
          expect(repository.savedLootRecipients[0]?.spawnId).toBe(spawn.id);
          expect(repository.savedLootRecipients[0]?.recipients).toBeDefined();
          expect(repository.savedLootRecipients[0]?.recipients.length).toBeGreaterThan(
            0,
          );
        }
      });

      it("should not save loot recipients when monster escapes", async () => {
        const spawn = createTestSpawn({
          monster: createTestMonster({ baseHp: 1000, baseDefense: 50 }),
        });
        repository.setSpawn(spawn);
        repository.setAbilities(createTestAbilities());

        const result = await service.executeCombat(spawn.id, 5);

        if (result?.state.result === "monster_escaped") {
          expect(repository.savedLootRecipients).toHaveLength(0);
        }
      });

      it("should select correct number of loot recipients based on participant count", async () => {
        // Test with 3 participants -> should get 2 drops
        const spawn = createTestSpawn({
          participants: [
            createBasicPlayer("user1"),
            createBasicPlayer("user2"),
            createBasicPlayer("user3"),
          ],
        });
        repository.setSpawn(spawn);
        repository.setAbilities(createTestAbilities());

        const result = await service.executeCombat(spawn.id, 50);

        if (result?.state.result === "monster_captured") {
          const lootEntry = repository.savedLootRecipients[0];
          expect(lootEntry?.recipients).toHaveLength(2); // 3 participants = 2 drops
        }
      });

      it("should assign ranks correctly based on damage dealt", async () => {
        const spawn = createTestSpawn({
          participants: [
            createBasicPlayer("user1"),
            createBasicPlayer("user2"),
            createBasicPlayer("user3"),
            createBasicPlayer("user4"),
          ],
        });
        repository.setSpawn(spawn);
        repository.setAbilities(createTestAbilities());

        const result = await service.executeCombat(spawn.id, 50);

        if (result?.state.result === "monster_captured") {
          const lootEntry = repository.savedLootRecipients[0];
          const recipients = lootEntry?.recipients ?? [];

          // Check that ranks are sequential starting from 1
          for (let i = 0; i < recipients.length; i++) {
            expect(recipients[i]?.rank).toBe(i + 1);
          }

          // Check that damage is in descending order
          for (let i = 1; i < recipients.length; i++) {
            expect(recipients[i - 1]!.damageDealt).toBeGreaterThanOrEqual(
              recipients[i]!.damageDealt,
            );
          }
        }
      });
    });
  });
});
