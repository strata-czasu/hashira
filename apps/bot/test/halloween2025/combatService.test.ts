import { beforeEach, describe, expect, it } from "bun:test";
import { Effect, Random } from "effect";

import type { PlayerAbility } from "../../src/events/halloween2025/combatLog";
import type { SpawnData } from "../../src/events/halloween2025/combatRepository";
import { MockCombatRepository } from "../../src/events/halloween2025/combatRepository";
import { CombatService } from "../../src/events/halloween2025/combatService";
import { PLAYER_ABILITIES } from "../../src/events/halloween2025/monsterData";
import { createBasicMonster, createBasicPlayer } from "./testEntities";

const seededRandom = (seed: number) => {
  const rng = Effect.runSync(Random.Random.pipe(Random.withSeed(seed)));
  return () => rng.nextDoubleUnsafe();
};

describe("CombatService", () => {
  let repository: MockCombatRepository;
  let service: CombatService;

  beforeEach(() => {
    repository = new MockCombatRepository();
    service = new CombatService(repository, seededRandom(42));
  });

  const createTestSpawn = (overrides?: Partial<SpawnData>): SpawnData => ({
    id: 1,
    channelId: "123456789",
    messageId: "987654321",
    spawnedAt: new Date(),
    expiresAt: new Date(Date.now() + 15000),
    guildId: "guild123",
    monster: createBasicMonster(),
    participants: [createBasicPlayer("user1"), createBasicPlayer("user2")],
    ...overrides,
  });

  const createTestAbilities = (): PlayerAbility[] =>
    PLAYER_ABILITIES.map(
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
        monster: createBasicMonster({ baseHp: 30, baseAttack: 5 }),
      });
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      const result = await service.executeCombat(spawn.id, 30);

      expect(result).not.toBeNull();
      expect(result?.state.isComplete).toBe(true);
      expect(result?.state.result).toBe("monster_captured");
      expect(result?.monster.name).toBe("Test Goblin");
    });

    it("should save combat log and update spawn status after simulation", async () => {
      const spawn = createTestSpawn();
      repository.setSpawn(spawn);
      repository.setAbilities(createTestAbilities());

      await service.executeCombat(spawn.id, 30);

      expect(repository.savedCombatLogs).toHaveLength(1);
      expect(repository.savedCombatLogs[0]?.spawnId).toBe(spawn.id);
      expect(repository.savedCombatLogs[0]?.state.events.length).toBeGreaterThan(0);
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
        monster: createBasicMonster({ baseHp: 1000, baseDefense: 50 }),
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
});
