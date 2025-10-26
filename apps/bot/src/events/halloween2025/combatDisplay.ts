import { EmbedBuilder } from "discord.js";
import type { CombatEvent, CombatState } from "./combatLog";

/**
 * Format combat events into readable Discord messages
 */

export const formatCombatEvent = (event: CombatEvent): string => {
  // Most events already have formatted messages
  return event.message;
};

export const formatCombatSummary = (state: CombatState): string => {
  const lines: string[] = [];

  lines.push("**⚔️ COMBAT SUMMARY ⚔️**");
  lines.push("");

  // Combat result
  if (state.result === "monster_captured") {
    const winner = state.combatants.get(state.winnerUserId ?? "");
    lines.push(`✅ **Victory!** The monster has been captured!`);
    if (winner) {
      lines.push(`🏆 **${winner.name}** dealt the final blow!`);
    }
  } else if (state.result === "all_players_defeated") {
    lines.push(`❌ **Defeat!** All players have been defeated!`);
  } else if (state.result === "monster_escaped") {
    lines.push(`🏃 **Escape!** The monster fled after ${state.currentTurn} turns!`);
  }

  lines.push("");
  lines.push(`📊 **Total Turns:** ${state.currentTurn}`);
  lines.push("");

  // Final stats
  lines.push("**Final Status:**");
  for (const [id, combatant] of state.combatants.entries()) {
    const hpBar = createHealthBar(combatant.stats.hp, combatant.stats.maxHp);
    const status = combatant.isDefeated ? "💀 DEFEATED" : hpBar;
    lines.push(`${combatant.name}: ${status}`);
  }

  return lines.join("\n");
};

export const createHealthBar = (current: number, max: number, length = 10): string => {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filled = Math.floor(percentage * length);
  const empty = length - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${bar} ${current}/${max} HP`;
};

export const formatCombatLog = (events: CombatEvent[], maxEvents = 50): string[] => {
  // Group events by turn for better readability
  const turnGroups = new Map<number, CombatEvent[]>();

  for (const event of events) {
    if (!turnGroups.has(event.turn)) {
      turnGroups.set(event.turn, []);
    }
    turnGroups.get(event.turn)!.push(event);
  }

  const lines: string[] = [];
  let eventCount = 0;

  for (const [turn, turnEvents] of turnGroups.entries()) {
    // Skip turn start/end markers if there are too many events
    const importantEvents = turnEvents.filter(
      (e) =>
        e.type !== "turn_start" || e.message.includes("---") || e.type === "combat_end",
    );

    for (const event of importantEvents) {
      if (eventCount >= maxEvents) {
        lines.push(`... and ${events.length - eventCount} more events ...`);
        return lines;
      }

      lines.push(formatCombatEvent(event));
      eventCount++;
    }
  }

  return lines;
};

export const createCombatEmbed = (
  state: CombatState,
  monsterName: string,
  includeFullLog = false,
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Combat vs ${monsterName}`)
    .setColor(state.result === "monster_captured" ? 0x00ff00 : 0xff0000)
    .setTimestamp();

  // Add summary
  const summary = formatCombatSummary(state);
  embed.setDescription(summary);

  // Add combat log (condensed)
  if (includeFullLog) {
    const logLines = formatCombatLog(state.events, 20);
    const logText = logLines.join("\n");

    if (logText.length > 1024) {
      // Split into multiple fields if too long
      const chunks = splitIntoChunks(logLines, 1024);
      for (let i = 0; i < chunks.length && i < 3; i++) {
        embed.addFields({
          name: i === 0 ? "📜 Combat Log" : "📜 Combat Log (cont.)",
          value: chunks[i],
          inline: false,
        });
      }
    } else {
      embed.addFields({
        name: "📜 Combat Log",
        value: logText || "No events recorded",
        inline: false,
      });
    }
  }

  return embed;
};

const splitIntoChunks = (lines: string[], maxLength: number): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

/**
 * Create a detailed combat statistics summary
 */
export const createCombatStats = (
  events: CombatEvent[],
): {
  damageDealt: Map<string, number>;
  damageTaken: Map<string, number>;
  healingDone: Map<string, number>;
  kills: Map<string, number>;
} => {
  const stats = {
    damageDealt: new Map<string, number>(),
    damageTaken: new Map<string, number>(),
    healingDone: new Map<string, number>(),
    kills: new Map<string, number>(),
  };

  for (const event of events) {
    switch (event.type) {
      case "attack":
      case "critical": {
        const actor = event.actor;
        const target = Array.isArray(event.target) ? event.target[0] : event.target;
        const damage = event.value ?? 0;

        stats.damageDealt.set(actor, (stats.damageDealt.get(actor) ?? 0) + damage);
        if (target) {
          stats.damageTaken.set(target, (stats.damageTaken.get(target) ?? 0) + damage);
        }
        break;
      }
      case "heal": {
        const actor = event.actor;
        const healing = event.value ?? 0;
        stats.healingDone.set(actor, (stats.healingDone.get(actor) ?? 0) + healing);
        break;
      }
      case "defeat": {
        const actor = event.actor;
        stats.kills.set(actor, (stats.kills.get(actor) ?? 0) + 1);
        break;
      }
    }
  }

  return stats;
};

export const formatCombatStatsEmbed = (
  events: CombatEvent[],
  combatants: Map<string, { name: string }>,
): EmbedBuilder => {
  const stats = createCombatStats(events);
  const embed = new EmbedBuilder().setTitle("📊 Combat Statistics").setColor(0x3498db);

  // Damage dealt
  const damageLines: string[] = [];
  for (const [id, damage] of Array.from(stats.damageDealt.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    const combatant = combatants.get(id);
    if (combatant) {
      damageLines.push(`${combatant.name}: **${damage}** damage`);
    }
  }
  if (damageLines.length > 0) {
    embed.addFields({
      name: "⚔️ Damage Dealt",
      value: damageLines.join("\n"),
      inline: true,
    });
  }

  // Healing done
  const healingLines: string[] = [];
  for (const [id, healing] of Array.from(stats.healingDone.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    const combatant = combatants.get(id);
    if (combatant && healing > 0) {
      healingLines.push(`${combatant.name}: **${healing}** HP`);
    }
  }
  if (healingLines.length > 0) {
    embed.addFields({
      name: "💚 Healing Done",
      value: healingLines.join("\n"),
      inline: true,
    });
  }

  return embed;
};
