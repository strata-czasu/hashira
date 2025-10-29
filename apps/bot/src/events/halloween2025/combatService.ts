import type { CompletedCombatState } from "./combatLog";
import { initializeCombatState, simulateCombat } from "./combatLog";
import type { ICombatRepository } from "./combatRepository";
import { selectLootRecipients } from "./lootDistribution";

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

  async executeCombat(
    spawnId: number,
    maxTurns = 50,
    userNameMap: Map<string, string> = new Map(),
  ): Promise<CombatResult | null> {
    const spawn = await this.repository.getSpawnById(spawnId);
    if (!spawn) return null;

    if (spawn.participants.length === 0) {
      await this.repository.updateSpawnStatus(spawnId, "completed_escaped");
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

    if (finalState.result === "monster_captured") {
      const recipients = selectLootRecipients(
        finalState.events,
        spawn.participants.length,
      );

      await this.repository.saveLootRecipients(spawnId, recipients);
    }

    await this.repository.updateSpawnStatus(spawnId, status);

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
