import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Random } from "effect";
import type { PlayerAbility } from "../../src/events/halloween2025/combatLog";
import type { SpawnData } from "../../src/events/halloween2025/combatRepository";
import { MockCombatRepository } from "../../src/events/halloween2025/combatRepository";
import { CombatService } from "../../src/events/halloween2025/combatService";
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
      expect(result?.state.winnerUserId).toBeTruthy();
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

    describe.each([
      {
        name: "Szopołak",
        createMonster: createWereraccoon,
        expectedCaptureRates: [0.0, 0.2, 0.5, 0.7, 0.8, 0.8, 0.8],
      },
      {
        name: "Duch Wędkarza",
        createMonster: createFishermanGhost,
        expectedCaptureRates: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.7],
      },
      {
        name: "Zombie Bruno",
        createMonster: createZombieCat,
        expectedCaptureRates: [0.1, 0.1, 0.1, 0.4, 0.2, 0.4, 0.4],
      },
      {
        name: "Harpia",
        createMonster: createHarpy,
        expectedCaptureRates: [0.05, 0.05, 0.15, 0.3, 0.3, 0.55, 0.65],
      },
      {
        name: "Opętana Lalka",
        createMonster: createPossessedDoll,
        expectedCaptureRates: [0.0, 0.0, 0.1, 0.3, 0.3, 0.3, 0.7],
      },
      {
        name: "Sukkub",
        createMonster: createSuccubus,
        expectedCaptureRates: [0, 0.1, 0.1, 0.2, 0.4, 0.5, 0.6],
      },
    ] as const)(
      "capture rate statistics for",
      ({ name, createMonster, expectedCaptureRates }) => {
        it.each([
          [name, 1, expectedCaptureRates[0]],
          [name, 2, expectedCaptureRates[1]],
          [name, 3, expectedCaptureRates[2]],
          [name, 4, expectedCaptureRates[3]],
          [name, 5, expectedCaptureRates[4]],
          [name, 6, expectedCaptureRates[5]],
          [name, 7, expectedCaptureRates[6]],
        ])(
          "%p with %i player(s) should have ~%p capture rate",
          async (_, playerCount, expectedRate) => {
            const NUM_FIGHTS = 100;
            const TOLERANCE = 0.1; // ±10% tolerance for statistical variance

            let captureCount = 0;
            const testRepository = new MockCombatRepository();
            const testService = new CombatService(testRepository, random);
            testRepository.setAbilities(createTestAbilities());

            for (let i = 0; i < NUM_FIGHTS; i++) {
              const players = Array.from(
                { length: playerCount },
                (_, idx) => `user${idx + 1}`,
              );
              const spawn = createTestSpawn({
                id: i + 1,
                monster: createMonster(),
                participants: players.map(createBasicPlayer),
              });
              testRepository.setSpawn(spawn);

              const result = await testService.executeCombat(spawn.id, 50);

              if (result?.state.result === "monster_captured") {
                captureCount++;
              }
            }

            const captureRate = captureCount / NUM_FIGHTS;
            const minRate = Math.max(0, expectedRate - TOLERANCE);
            const maxRate = Math.min(1, expectedRate + TOLERANCE);

            console.log(
              `${name} with ${playerCount} player(s): ${captureCount}/${NUM_FIGHTS} captures (${(captureRate * 100).toFixed(1)}% vs expected ${(expectedRate * 100).toFixed(1)}%)`,
            );

            expect(captureRate).toBeGreaterThanOrEqual(minRate);
            expect(captureRate).toBeLessThanOrEqual(maxRate);
          },
        );
      },
    );
  });
});
