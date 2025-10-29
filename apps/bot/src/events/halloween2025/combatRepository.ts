import type { $Enums, PrismaTransaction } from "@hashira/db";
import type {
  ActionEffect,
  CombatState,
  CompletedCombatState,
  MonsterAction,
  PlayerAbility,
} from "./combatLog";
import type { LootRecipient } from "./lootDistribution";

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
  getSpawnById(spawnId: number): Promise<SpawnData | null>;
  getDefaultPlayerAbilities(): Promise<PlayerAbility[]>;
  saveCombatLog(spawnId: number, state: CombatState): Promise<void>;
  updateSpawnStatus(
    spawnId: number,
    status: Exclude<$Enums.Halloween2025CombatState, "pending" | "in_progress">,
  ): Promise<void>;
  saveLootRecipients(spawnId: number, recipients: LootRecipient[]): Promise<void>;
}

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
      },
      update: {
        events: state.events,
        currentTurn: state.currentTurn,
        combatState: combatStateJson,
        endedAt: state.isComplete ? new Date() : null,
        result: state.result ?? null,
      },
    });
  }

  async updateSpawnStatus(
    spawnId: number,
    status: Exclude<$Enums.Halloween2025CombatState, "pending" | "in_progress">,
  ): Promise<void> {
    await this.prisma.halloween2025MonsterSpawn.update({
      where: { id: spawnId },
      data: {
        combatState: status,
      },
    });
  }

  async saveLootRecipients(
    spawnId: number,
    recipients: LootRecipient[],
  ): Promise<void> {
    await this.prisma.halloween2025MonsterLoot.createMany({
      data: recipients.map((recipient) => ({
        spawnId,
        userId: recipient.userId,
        damageDealt: recipient.damageDealt,
        rank: recipient.rank,
      })),
    });
  }
}

export class MockCombatRepository implements ICombatRepository {
  private spawns = new Map<number, SpawnData>();
  private abilities: PlayerAbility[] = [];
  private monsters = new Map<number, MonsterData>();
  public savedCombatLogs: Array<{ spawnId: number; state: CombatState }> = [];
  public updatedSpawns: Array<{ spawnId: number; status: string }> = [];
  public savedLootRecipients: Array<{ spawnId: number; recipients: LootRecipient[] }> =
    [];

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
  ): Promise<void> {
    this.updatedSpawns.push({ spawnId, status });
  }

  async saveLootRecipients(
    spawnId: number,
    recipients: LootRecipient[],
  ): Promise<void> {
    this.savedLootRecipients.push({ spawnId, recipients });
  }

  reset(): void {
    this.spawns.clear();
    this.abilities = [];
    this.monsters.clear();
    this.savedCombatLogs = [];
    this.updatedSpawns = [];
    this.savedLootRecipients = [];
  }
}
