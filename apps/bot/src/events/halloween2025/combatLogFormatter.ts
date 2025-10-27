import type { Combatant, CombatEvent } from "./combatLog";

/**
 * Format status effects for display
 */
function formatStatusEffects(combatant: Combatant): string {
  if (combatant.statusEffects.length === 0) return "";

  const effects = combatant.statusEffects
    .map((effect) => {
      const symbol = {
        burn: "🔥",
        poison: "☠️",
        stun: "⚡",
        shield: "🛡️",
        regen: "💚",
        berserk: "😤",
        thorns: "🌹",
        weakness: "📉",
        strength: "📈",
      }[effect.type];
      return `${symbol}${effect.type}(${effect.duration})`;
    })
    .join(" ");

  return effects ? ` [${effects}]` : "";
}

/**
 * Format combatant stats for summary display
 */
function formatCombatantStatus(combatant: Combatant): string {
  const hp = Math.max(0, combatant.stats.hp);
  const maxHp = combatant.stats.maxHp;
  const defeated = combatant.isDefeated ? " ☠️ POKONANY" : "";
  const effects = formatStatusEffects(combatant);

  const hpBar = Math.round((hp / maxHp) * 10);
  const filledBar = "█".repeat(hpBar);
  const emptyBar = "░".repeat(10 - hpBar);

  return `${combatant.name}: \`[${filledBar}${emptyBar}] ${hp}/${maxHp} HP\`${effects}${defeated}`;
}

/**
 * Create a summary of all combatants' current status
 */
export function formatTurnSummary(
  combatants: Map<string, Combatant>,
  turnNumber: number,
): string {
  const sortedCombatants = Array.from(combatants.values()).sort((a, b) => {
    // Monster first, then users sorted by name
    if (a.type === "monster") return -1;
    if (b.type === "monster") return 1;
    return a.name.localeCompare(b.name);
  });

  const summary = sortedCombatants.map((c) => formatCombatantStatus(c)).join("\n");

  return `\n**📊 Podsumowanie Tury ${turnNumber}:**\n${summary}`;
}

/**
 * Format turn events and summary into a single Discord message
 */
export function formatTurnMessage(
  events: CombatEvent[],
  combatants: Map<string, Combatant>,
  turnNumber: number,
): string {
  const turnEvents = events.filter((e) => e.turn === turnNumber);

  const eventMessages = turnEvents
    .filter((e) => !(e.type === "turn_start" && e.actor === "system"))
    .map((e) => `• ${e.message}`)
    .join("\n");

  const summary = formatTurnSummary(combatants, turnNumber);

  return eventMessages ? `${eventMessages}${summary}` : summary;
}

/**
 * Group events by turn and format for display
 */
export function groupEventsByTurn(events: CombatEvent[]): Map<number, CombatEvent[]> {
  const grouped = new Map<number, CombatEvent[]>();

  for (const event of events) {
    if (!grouped.has(event.turn)) {
      grouped.set(event.turn, []);
    }
    grouped.get(event.turn)?.push(event);
  }

  return grouped;
}
