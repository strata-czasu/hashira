import type { CompletedCombatState } from "./combatLog";
import { initializeCombatState, simulateCombat } from "./combatLog";
import type { ICombatRepository } from "./combatRepository";

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
  constructor(
    private repository: ICombatRepository,
    private random: () => number,
  ) {}

  /**
   * Execute combat for a spawn
   * @param spawnId The spawn ID
   * @param maxTurns Maximum number of turns before monster escapes
   * @param userNameMap Optional map of userId to display name for nicer event messages
   */
  async executeCombat(
    spawnId: number,
    maxTurns = 50,
    userNameMap: Map<string, string> = new Map(),
  ): Promise<CombatResult | null> {
    const spawn = await this.repository.getSpawnById(spawnId);
    if (!spawn) return null;

    if (spawn.participants.length === 0) {
      await this.repository.updateSpawnStatus(spawnId, "completed_escaped", null);
      return null;
    }

    const playerAbilities = await this.repository.getDefaultPlayerAbilities();
    const combatState = initializeCombatState(
      spawn.monster,
      spawn.participants,
      userNameMap,
    );
    const finalState = await simulateCombat(
      combatState,
      playerAbilities,
      maxTurns,
      this.random,
    );

    await this.repository.saveCombatLog(spawnId, finalState);

    const status =
      finalState.result === "monster_captured"
        ? "completed_captured"
        : "completed_escaped";
    await this.repository.updateSpawnStatus(spawnId, status, finalState.winnerUserId);

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
}
