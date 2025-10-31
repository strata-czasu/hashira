import type { $Enums, PrismaTransaction } from "@hashira/db";
import { endOfDay, startOfDay } from "date-fns";
import { getUsersTextActivity, getUsersVoiceActivity } from "../../userActivity/util";
import type {
  ActionEffect,
  CombatState,
  CompletedCombatState,
  MonsterAction,
  PlayerAbility,
} from "./combatLog";
import type { LootRecipient } from "./lootDistribution";

export type StatsModifiers = {
  hpBonus?: number;
  hpMultiplier?: number;
  attackBonus?: number;
  attackMultiplier?: number;
  defenseBonus?: number;
  defenseMultiplier?: number;
  speedBonus?: number;
  speedMultiplier?: number;
};

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
  modifiers: StatsModifiers;
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

const getModifiers = (
  modifiers: Map<string, StatsModifiers>,
  userId: string,
): StatsModifiers => {
  return (
    modifiers.get(userId) ?? {
      hpBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      speedBonus: 0,
    }
  );
};

export interface ICombatRepository {
  getSpawnById(spawnId: number): Promise<SpawnData | null>;
  getDefaultPlayerAbilities(): Promise<PlayerAbility[]>;
  getUserModifiersBatch(
    userIds: string[],
    guildId: string,
  ): Promise<Map<string, StatsModifiers>>;
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
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!spawn) return null;

    const userIds = spawn.catchAttempts.map((a) => a.userId);
    const modifiersMap = await this.getUserModifiersBatch(userIds, spawn.guildId);

    const participantsWithModifiers = spawn.catchAttempts.map((attempt) => ({
      userId: attempt.userId,
      username: attempt.user.id,
      attemptedAt: attempt.attemptedAt,
      modifiers: getModifiers(modifiersMap, attempt.userId),
    }));

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
      participants: participantsWithModifiers,
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

  async getUserModifiersBatch(
    userIds: string[],
    guildId: string,
  ): Promise<Map<string, StatsModifiers>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const textActivityMap = await getUsersTextActivity({
      prisma: this.prisma,
      guildId,
      userIds,
      since: start,
      to: end,
    });

    const voiceActivityMap = await getUsersVoiceActivity({
      prisma: this.prisma,
      guildId,
      userIds,
      since: start,
      to: end,
    });

    const modifiersMap = new Map<string, StatsModifiers>();
    for (const userId of userIds) {
      const textActivity = textActivityMap.get(userId) ?? 0;
      const voiceSeconds = voiceActivityMap.get(userId) ?? 0;
      const voiceMinutes = voiceSeconds / 60;
      const voiceHours = voiceMinutes / 60;

      const hpBonus = Math.round(Math.min(textActivity / 100 + voiceMinutes / 3, 50));
      const attackBonus = Math.round(Math.min(textActivity / 1000 + voiceHours, 3));
      const defenseBonus = Math.round(Math.min(textActivity / 1000 + voiceHours, 4));

      modifiersMap.set(userId, {
        hpBonus,
        attackBonus,
        defenseBonus,
      });
    }

    return modifiersMap;
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
  public savedCombatLogs: { spawnId: number; state: CombatState }[] = [];
  public updatedSpawns: { spawnId: number; status: string }[] = [];
  public savedLootRecipients: { spawnId: number; recipients: LootRecipient[] }[] = [];

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

  async getUserModifiersBatch(
    userIds: string[],
    _guildId: string,
    _startDate?: Date,
    _endDate?: Date,
  ): Promise<Map<string, StatsModifiers>> {
    const modifiersMap = new Map<string, StatsModifiers>();
    for (const userId of userIds) {
      modifiersMap.set(userId, {});
    }
    return modifiersMap;
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
