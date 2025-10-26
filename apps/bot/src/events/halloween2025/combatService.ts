import type { CombatState, CompletedCombatState } from "./combatLog";
import { initializeCombatState, simulateCombat } from "./combatLog";
import type { ICombatRepository, SpawnData } from "./combatRepository";

/**
 * Combat service layer - orchestrates combat simulation and persistence
 * Separated from database access for easy testing
 */

export type CombatResult = {
  state: CompletedCombatState;
  spawn: {
    id: number;
    channelId: string;
    messageId: string;
    guildId: string;
  };
  monster: {
    name: string;
    image: string;
  };
};

export class CombatService {
  constructor(private repository: ICombatRepository) {}

  /**
   * Execute combat for a spawn
   */
  async executeCombat(spawnId: number, maxTurns = 50): Promise<CombatResult | null> {
    // 1. Fetch spawn data
    const spawn = await this.repository.getSpawnById(spawnId);
    if (!spawn) {
      return null;
    }

    // Skip if no participants
    if (spawn.participants.length === 0) {
      await this.repository.updateSpawnStatus(spawnId, "completed_escaped", null);
      return null;
    }

    // 2. Get player abilities
    const playerAbilities = await this.repository.getDefaultPlayerAbilities();

    // 3. Initialize combat state
    const combatState = initializeCombatState(spawn.monster, spawn.participants);

    // 4. Simulate combat
    const finalState = await simulateCombat(combatState, playerAbilities, maxTurns);

    // 5. Save results
    await this.repository.saveCombatLog(spawnId, finalState);

    // 6. Update spawn status
    const status =
      finalState.result === "monster_captured"
        ? "completed_captured"
        : "completed_escaped";
    await this.repository.updateSpawnStatus(spawnId, status, finalState.winnerUserId);

    // 7. Award rewards if captured
    if (finalState.result === "monster_captured" && finalState.winnerUserId) {
      await this.awardCaptureRewards(
        finalState.winnerUserId,
        spawn.guildId,
        spawn.monster.baseHp,
      );
    }

    return {
      state: finalState,
      spawn: {
        id: spawn.id,
        channelId: spawn.channelId,
        messageId: spawn.messageId,
        guildId: spawn.guildId,
      },
      monster: {
        name: spawn.monster.name,
        image: spawn.monster.image,
      },
    };
  }

  /**
   * Award rewards to the player who captured the monster
   */
  private async awardCaptureRewards(
    userId: string,
    guildId: string,
    monsterBaseHp: number,
  ): Promise<void> {}

  /**
   * Get combat statistics for a spawn
   */
  async getCombatStats(spawnId: number): Promise<{
    totalDamage: number;
    totalHealing: number;
    turns: number;
    participants: number;
  } | null> {
    const spawn = await this.repository.getSpawnById(spawnId);
    if (!spawn) return null;

    // This would require fetching the combat log from database
    // For now, return basic stats
    return {
      totalDamage: 0,
      totalHealing: 0,
      turns: 0,
      participants: spawn.participants.length,
    };
  }
}
