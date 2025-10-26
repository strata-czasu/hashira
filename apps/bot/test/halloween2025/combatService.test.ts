import { beforeEach, describe, expect, it } from "bun:test";
import type { PlayerAbility } from "../../src/events/halloween2025/combatLog";
import type {
  MonsterData,
  SpawnData,
} from "../../src/events/halloween2025/combatRepository";
import { MockCombatRepository } from "../../src/events/halloween2025/combatRepository";
import { CombatService } from "../../src/events/halloween2025/combatService";

describe("CombatService", () => {
  let repository: MockCombatRepository;
  let service: CombatService;

  beforeEach(() => {
    repository = new MockCombatRepository();
    service = new CombatService(repository);
  });

  const createTestMonster = (overrides?: Partial<MonsterData>): MonsterData => ({
    id: 1,
    name: "Test Goblin",
    baseHp: 50,
    baseAttack: 8,
    baseDefense: 3,
    image: "https://example.com/goblin.png",
    actions: [
      {
        id: 1,
        name: "Slash",
        description: "Basic attack",
        actionType: "attack",
        power: 10,
        weight: 100,
        cooldown: 0,
        isAoe: false,
        canTargetSelf: false,
      },
    ],
    ...overrides,
  });

  const createTestSpawn = (overrides?: Partial<SpawnData>): SpawnData => ({
    id: 1,
    channelId: "123456789",
    messageId: "987654321",
    spawnedAt: new Date(),
    expiresAt: new Date(Date.now() + 15000),
    guildId: "guild123",
    monster: createTestMonster(),
    participants: [
      { userId: "user1", username: "Player1", attemptedAt: new Date() },
      { userId: "user2", username: "Player2", attemptedAt: new Date() },
    ],
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
      expect(repository.updatedSpawns[0].status).toBe("completed_escaped");
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
      expect(repository.savedCombatLogs[0].spawnId).toBe(spawn.id);
      expect(repository.savedCombatLogs[0].state.events.length).toBeGreaterThan(0);
    });

    it("should update spawn status after combat", async () => {
      const spawn = createTestSpawn();
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      await service.executeCombat(spawn.id, 30);

      expect(repository.updatedSpawns).toHaveLength(1);
      expect(repository.updatedSpawns[0].spawnId).toBe(spawn.id);
      expect(repository.updatedSpawns[0].status).toMatch(/completed_/);
    });

    it("should handle multiple participants", async () => {
      const spawn = createTestSpawn({
        participants: [
          { userId: "user1", username: "Player1", attemptedAt: new Date() },
          { userId: "user2", username: "Player2", attemptedAt: new Date() },
          { userId: "user3", username: "Player3", attemptedAt: new Date() },
          { userId: "user4", username: "Player4", attemptedAt: new Date() },
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
  });

  describe("getCombatStats", () => {
    it("should return null for non-existent spawn", async () => {
      const stats = await service.getCombatStats(999);
      expect(stats).toBeNull();
    });

    it("should return basic stats for existing spawn", async () => {
      const spawn = createTestSpawn();
      repository.setSpawn(spawn);

      const stats = await service.getCombatStats(spawn.id);

      expect(stats).not.toBeNull();
      expect(stats?.participants).toBe(2);
    });
  });
});
