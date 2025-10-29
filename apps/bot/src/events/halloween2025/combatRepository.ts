import type { $Enums, PrismaTransaction } from "@hashira/db";
import type {
  ActionEffect,
  CombatState,
  CompletedCombatState,
  MonsterAction,
  PlayerAbility,
} from "./combatLog";

export type MonsterData = {
  id: number;
  name: string;
  rarity: $Enums.Halloween2025MonsterRarity;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  image: string;
  actions: MonsterAction[];
};

export type PlayerData = {
  userId: string;
  username: string;
  attemptedAt: Date;
};

export type SpawnData = {
  id: number;
  channelId: string;
  messageId: string;
  spawnedAt: Date;
  expiresAt: Date;
  guildId: string;
  monster: MonsterData;
  participants: PlayerData[];
};

export interface ICombatRepository {
  /**
   * Get spawn with monster and participants
   */
  getSpawnById(spawnId: number): Promise<SpawnData | null>;

  /**
   * Get all default player abilities
   */
  getDefaultPlayerAbilities(): Promise<PlayerAbility[]>;

  /**
   * Save combat state to database
   */
  saveCombatLog(spawnId: number, state: CombatState): Promise<void>;

  /**
   * Update spawn status after combat
   */
  updateSpawnStatus(
    spawnId: number,
    status: Exclude<$Enums.Halloween2025CombatState, "pending" | "in_progress">,
    winnerUserId: string | null,
  ): Promise<void>;
}

/**
 * Prisma implementation of combat repository
 */
export class PrismaCombatRepository implements ICombatRepository {
  constructor(private prisma: PrismaTransaction) {}

  async getSpawnById(spawnId: number): Promise<SpawnData | null> {
    const spawn = await this.prisma.halloween2025MonsterSpawn.findUnique({
      where: { id: spawnId },
      include: {
        monster: {
          include: { actions: true },
        },
        catchAttempts: {
          include: { user: true },
        },
      },
    });

    if (!spawn) return null;

    return {
      id: spawn.id,
      channelId: spawn.channelId,
      messageId: spawn.messageId,
      spawnedAt: spawn.spawnedAt,
      expiresAt: spawn.expiresAt,
      guildId: spawn.guildId,
      monster: {
        id: spawn.monster.id,
        name: spawn.monster.name,
        baseHp: spawn.monster.baseHp,
        baseAttack: spawn.monster.baseAttack,
        baseDefense: spawn.monster.baseDefense,
        baseSpeed: spawn.monster.baseSpeed,
        image: spawn.monster.image,
        rarity: spawn.rarity,
        actions: spawn.monster.actions.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          actionType: a.actionType,
          power: a.power,
          weight: a.weight,
          cooldown: a.cooldown,
          isAoe: a.isAoe,
          canTargetSelf: a.canTargetSelf,
          effects: a.effects as ActionEffect,
        })),
      },
      participants: spawn.catchAttempts.map((attempt) => ({
        userId: attempt.userId,
        username: attempt.user.id,
        attemptedAt: attempt.attemptedAt,
      })),
    };
  }

  async getDefaultPlayerAbilities(): Promise<PlayerAbility[]> {
    const abilities = await this.prisma.halloween2025PlayerAbility.findMany({
      where: { isDefault: true },
    });

    return abilities.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      abilityType: a.abilityType,
      power: a.power,
      cooldown: a.cooldown,
      canTargetPlayers: a.canTargetPlayers,
      canTargetSelf: a.canTargetSelf,
      isAoe: a.isAoe,
      effects: a.effects as ActionEffect,
    }));
  }

  async saveCombatLog(spawnId: number, state: CompletedCombatState): Promise<void> {
    const combatStateJson = {
      combatants: Array.from(state.combatants.entries()).map(([id, c]) => ({
        id,
        type: c.type,
        name: c.name,
        stats: c.stats,
        statusEffects: c.statusEffects,
        isDefeated: c.isDefeated,
      })),
      turnOrder: state.turnOrder,
    };

    await this.prisma.halloween2025CombatLog.upsert({
      where: { spawnId },
      create: {
        spawnId,
        events: state.events,
        currentTurn: state.currentTurn,
        combatState: combatStateJson,
        endedAt: state.isComplete ? new Date() : null,
        result: state.result ?? null,
        winnerUserId: state.winnerUserId ?? null,
      },
      update: {
        events: state.events,
        currentTurn: state.currentTurn,
        combatState: combatStateJson,
        endedAt: state.isComplete ? new Date() : null,
        result: state.result ?? null,
        winnerUserId: state.winnerUserId ?? null,
      },
    });
  }

  async updateSpawnStatus(
    spawnId: number,
    status: Exclude<$Enums.Halloween2025CombatState, "pending" | "in_progress">,
    winnerUserId: string | null,
  ): Promise<void> {
    await this.prisma.halloween2025MonsterSpawn.update({
      where: { id: spawnId },
      data: {
        combatState: status,
        userId: winnerUserId,
      },
    });
  }
}

/**
 * Mock implementation for testing
 */
export class MockCombatRepository implements ICombatRepository {
  private spawns = new Map<number, SpawnData>();
  private abilities: PlayerAbility[] = [];
  private monsters = new Map<number, MonsterData>();
  public savedCombatLogs: Array<{ spawnId: number; state: CombatState }> = [];
  public updatedSpawns: Array<{
    spawnId: number;
    status: string;
    winnerUserId: string | null;
  }> = [];

  setSpawn(spawn: SpawnData): void {
    this.spawns.set(spawn.id, spawn);
  }

  setAbilities(abilities: PlayerAbility[]): void {
    this.abilities = abilities;
  }

  setMonster(monster: MonsterData): void {
    this.monsters.set(monster.id, monster);
  }

  async getSpawnById(spawnId: number): Promise<SpawnData | null> {
    return this.spawns.get(spawnId) ?? null;
  }

  async getDefaultPlayerAbilities(): Promise<PlayerAbility[]> {
    return this.abilities;
  }

  async saveCombatLog(spawnId: number, state: CombatState): Promise<void> {
    this.savedCombatLogs.push({ spawnId, state });
  }

  async updateSpawnStatus(
    spawnId: number,
    status: Exclude<$Enums.Halloween2025CombatState, "pending" | "in_progress">,
    winnerUserId: string | null,
  ): Promise<void> {
    this.updatedSpawns.push({ spawnId, status, winnerUserId });
  }

  reset(): void {
    this.spawns.clear();
    this.abilities = [];
    this.monsters.clear();
    this.savedCombatLogs = [];
    this.updatedSpawns = [];
  }
}
