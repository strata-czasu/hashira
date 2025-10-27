import type { $Enums } from "@hashira/db";
import { weightedRandom } from "../../util/weightedRandom";
import type { MonsterData, PlayerData } from "./combatRepository";

export type CombatantId = string; // userId for players, "monster" for monster

type StatusEffectType =
  | "burn"
  | "poison"
  | "stun"
  | "shield"
  | "regen"
  | "berserk"
  | "thorns"
  | "weakness"
  | "strength";

export type StatusEffect = {
  type: StatusEffectType;
  power: number;
  duration: number;
  source: CombatantId;
};

export type CombatStats = {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
};

export type CombatUser = {
  type: "user";
  id: CombatantId;
  name: string;
  stats: CombatStats;
  statusEffects: StatusEffect[];
  abilityCooldowns: Map<string, number>;
  isDefeated: boolean;
};

export type CombatMonster = {
  type: "monster";
  id: "monster";
  name: string;
  stats: CombatStats;
  statusEffects: StatusEffect[];
  actionCooldowns: Map<string, number>;
  isDefeated: boolean;
  availableActions: MonsterAction[];
};

export type Combatant = CombatUser | CombatMonster;

export type TargetType =
  | "self"
  | "ally"
  | "enemy"
  | "all_allies"
  | "all_enemies"
  | "all";

export type ActionEffect = {
  burn?: number;
  poison?: number;
  stun?: boolean;
  shield?: number;
  regen?: number;
  berserk?: boolean;
  thorns?: number;
  lifesteal?: number; // percentage
  weakness?: number; // reduces attack
  strength?: number; // increases attack
  vampiric?: boolean; // heals based on damage dealt
};

export type MonsterAction = {
  id: number;
  name: string;
  description: string;
  actionType: $Enums.Halloween2025ActionType;
  power: number;
  weight: number;
  cooldown: number;
  isAoe: boolean;
  canTargetSelf: boolean;
  effects?: ActionEffect;
};

export type PlayerAbility = {
  id: number;
  name: string;
  description: string;
  abilityType: $Enums.Halloween2025AbilityType;
  power: number;
  cooldown: number;
  canTargetPlayers: boolean;
  canTargetSelf: boolean;
  isAoe: boolean;
  effects?: ActionEffect;
};

export type CombatEventType =
  | "turn_start"
  | "attack"
  | "heal"
  | "defend"
  | "buff"
  | "debuff"
  | "status_effect"
  | "dodge"
  | "critical"
  | "defeat"
  | "turn_end"
  | "combat_end";

export type CombatEvent = {
  turn: number;
  type: CombatEventType;
  actor: CombatantId;
  target?: CombatantId | CombatantId[];
  action?: string;
  value?: number;
  message: string;
};

export type InProgresCombatState = {
  combatants: Map<CombatantId, Combatant>;
  events: CombatEvent[];
  currentTurn: number;
  turnOrder: CombatantId[];
  isComplete: false;
  result?: undefined;
  winnerUserId?: undefined;
};

export type CompletedCombatState = {
  combatants: Map<CombatantId, Combatant>;
  events: CombatEvent[];
  currentTurn: number;
  turnOrder: CombatantId[];
  isComplete: true;
  result: $Enums.Halloween2025CombatResult;
  winnerUserId: string | null;
};

export type CombatState = InProgresCombatState | CompletedCombatState;

const calculateDamage = (
  attacker: Combatant,
  target: Combatant,
  basePower: number,
  isCritical = false,
): number => {
  let damage = basePower + attacker.stats.attack - target.stats.defense;

  const strengthBuff = attacker.statusEffects.find((e) => e.type === "strength");
  if (strengthBuff) damage += strengthBuff.power;

  const weaknessDebuff = attacker.statusEffects.find((e) => e.type === "weakness");
  if (weaknessDebuff) damage -= weaknessDebuff.power;

  const shield = target.statusEffects.find((e) => e.type === "shield");
  if (shield) {
    damage = Math.max(0, damage - shield.power);
  }

  if (isCritical) damage = Math.floor(damage * 1.5);

  return Math.max(1, Math.floor(damage));
};

const applyDamage = (target: Combatant, damage: number): void => {
  target.stats.hp = Math.max(0, target.stats.hp - damage);
  if (target.stats.hp === 0) {
    target.isDefeated = true;
  }
};

const applyHealing = (target: Combatant, amount: number): number => {
  const oldHp = target.stats.hp;
  target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + amount);
  return target.stats.hp - oldHp;
};

const applyStatusEffect = (target: Combatant, effect: StatusEffect): void => {
  const existingIndex = target.statusEffects.findIndex(
    (e) => e.type === effect.type && e.source === effect.source,
  );

  if (existingIndex >= 0) {
    // Refresh duration and update power
    target.statusEffects[existingIndex] = effect;
  } else {
    target.statusEffects.push(effect);
  }
};

const processStatusEffects = (
  combatant: Combatant,
  events: CombatEvent[],
  turn: number,
): void => {
  const effectsToRemove: number[] = [];

  for (let i = 0; i < combatant.statusEffects.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: used with index check
    const effect = combatant.statusEffects[i]!;

    switch (effect.type) {
      case "burn":
      case "poison": {
        const damage = effect.power;
        applyDamage(combatant, damage);
        events.push({
          turn,
          type: "status_effect",
          actor: combatant.id,
          value: damage,
          message: `${combatant.name} receives ${damage} damage from ${effect.type}`,
        });
        break;
      }
      case "regen": {
        const healing = applyHealing(combatant, effect.power);
        if (healing > 0) {
          events.push({
            turn,
            type: "status_effect",
            actor: combatant.id,
            value: healing,
            message: `${combatant.name} regenerates ${healing} HP`,
          });
        }
        break;
      }
      case "thorns": {
        break;
      }
    }

    effect.duration--;
    if (effect.duration <= 0) {
      effectsToRemove.push(i);
    }
  }

  for (let i = effectsToRemove.length - 1; i >= 0; i--) {
    // biome-ignore lint/style/noNonNullAssertion: used with index check
    combatant.statusEffects.splice(effectsToRemove[i]!, 1);
  }
};

const rollCritical = (random: () => number): boolean => {
  return random() < 0.15;
};

const rollDodge = (combatant: Combatant, random: () => number): boolean => {
  const dodgeChance = Math.min(0.25, combatant.stats.speed / 200);
  return random() < dodgeChance;
};

const getAliveCombatants = (
  combatants: Map<CombatantId, Combatant>,
  predicate?: (c: Combatant) => boolean,
): Combatant[] => {
  const alive: Combatant[] = [];
  for (const combatant of combatants.values()) {
    if (!combatant.isDefeated && (!predicate || predicate(combatant))) {
      alive.push(combatant);
    }
  }
  return alive;
};

const selectRandomTarget = (
  candidates: Combatant[],
  random: () => number,
): Combatant | null => {
  if (candidates.length === 0) return null;
  const randomIndex = Math.floor(random() * candidates.length);
  // biome-ignore lint/style/noNonNullAssertion: candidates is non-empty
  return candidates[randomIndex]!;
};

const selectMonsterAction = (
  monster: CombatMonster,
  random: () => number,
): MonsterAction | null => {
  const available = monster.availableActions.filter((action) => {
    const cooldown = monster.actionCooldowns.get(action.name) || 0;
    return cooldown === 0;
  });

  return weightedRandom(available, (a) => a.weight, random);
};

const selectPlayerAction = (
  player: CombatUser,
  availableAbilities: PlayerAbility[],
): {
  ability: PlayerAbility;
  targetType: "monster" | "self" | "ally";
} | null => {
  const usableAbilities = availableAbilities.filter((ability) => {
    const cooldown = player.abilityCooldowns.get(ability.name) || 0;
    return cooldown === 0;
  });

  if (usableAbilities.length === 0) return null;

  if (player.stats.hp < player.stats.maxHp * 0.3) {
    const healAbility = usableAbilities.find(
      (a) => a.abilityType === "heal" && a.canTargetSelf,
    );
    if (healAbility) {
      return { ability: healAbility, targetType: "self" };
    }
  }

  const attackAbility = usableAbilities.find((a) => a.abilityType === "attack");
  if (attackAbility) {
    return { ability: attackAbility, targetType: "monster" };
  }

  // biome-ignore lint/style/noNonNullAssertion: usableAbilities is non-empty
  return { ability: usableAbilities[0]!, targetType: "monster" };
};

// ============================================================================
// Combat Actions
// ============================================================================

const executeMonsterAction = (
  state: CombatState,
  monster: CombatMonster,
  action: MonsterAction,
  random: () => number,
): void => {
  const { combatants, events, currentTurn } = state;
  const players = getAliveCombatants(combatants, (c) => c.type === "user");

  events.push({
    turn: currentTurn,
    type: "turn_start",
    actor: monster.id,
    action: action.name,
    message: `${monster.name} uses ${action.name}!`,
  });

  // Set cooldown
  monster.actionCooldowns.set(action.name, action.cooldown);

  let targets: Combatant[] = [];
  if (action.isAoe) {
    targets = action.canTargetSelf ? [monster, ...players] : players;
  } else {
    const target = selectRandomTarget(
      action.canTargetSelf ? [monster, ...players] : players,
      random,
    );
    if (target) targets = [target];
  }

  // Execute action
  for (const target of targets) {
    switch (action.actionType) {
      case "attack":
      case "heal": {
        const healing = applyHealing(target, action.power);
        events.push({
          turn: currentTurn,
          type: "heal",
          actor: monster.id,
          target: target.id,
          value: healing,
          message: `${target.name} is healed for ${healing} HP`,
        });
        break;
      }
      case "buff":
      case "debuff":
      case "defend": {
        if (action.effects) {
          applyActionEffects(monster, target, action.effects, events, currentTurn);
        }
        break;
      }
    }
  }
};

const executePlayerAction = (
  state: CombatState,
  player: CombatUser,
  ability: PlayerAbility,
  targetType: "monster" | "self" | "ally",
  random: () => number,
): void => {
  const { combatants, events, currentTurn } = state;

  events.push({
    turn: currentTurn,
    type: "turn_start",
    actor: player.id,
    action: ability.name,
    message: `${player.name} uses ${ability.name}!`,
  });

  // Set cooldown
  player.abilityCooldowns.set(ability.name, ability.cooldown);

  let targets: Combatant[] = [];
  // biome-ignore lint/style/noNonNullAssertion: monster must exist
  const monster = combatants.get("monster")!;
  const alivePlayers = getAliveCombatants(combatants, (c) => c.type === "user");

  if (ability.isAoe) {
    targets = [...alivePlayers];

    if (ability.abilityType === "heal" || ability.abilityType === "buff") {
      targets.push(player);
    } else {
      targets.push(monster);
    }
  } else {
    switch (targetType) {
      case "monster":
        if (monster && !monster.isDefeated) targets = [monster];
        break;
      case "self":
        targets = [player];
        break;
      case "ally": {
        const ally = selectRandomTarget(
          alivePlayers.filter((p) => p.id !== player.id),
          random,
        );
        if (ally) targets = [ally];
        break;
      }
    }
  }

  for (const target of targets) {
    switch (ability.abilityType) {
      case "attack": {
        if (rollDodge(target, random)) {
          events.push({
            turn: currentTurn,
            type: "dodge",
            actor: player.id,
            target: target.id,
            message: `${target.name} dodges the attack!`,
          });
          continue;
        }

        const isCritical = rollCritical(random);
        const damage = calculateDamage(player, target, ability.power, isCritical);
        applyDamage(target, damage);

        if (ability.effects?.lifesteal) {
          const lifesteal = Math.floor(damage * ability.effects.lifesteal);
          applyHealing(player, lifesteal);
          events.push({
            turn: currentTurn,
            type: "heal",
            actor: player.id,
            target: player.id,
            value: lifesteal,
            message: `${player.name} lifesteals ${lifesteal} HP`,
          });
        }

        events.push({
          turn: currentTurn,
          type: isCritical ? "critical" : "attack",
          actor: player.id,
          target: target.id,
          value: damage,
          message: `${target.name} takes ${damage} damage${isCritical ? " (CRITICAL!)" : ""}`,
        });

        if (ability.effects) {
          applyActionEffects(player, target, ability.effects, events, currentTurn);
        }

        if (target.isDefeated) {
          events.push({
            turn: currentTurn,
            type: "defeat",
            actor: player.id,
            target: target.id,
            message: `${target.name} has been defeated!`,
          });
        }
        break;
      }
      case "heal": {
        const healing = applyHealing(target, ability.power);
        events.push({
          turn: currentTurn,
          type: "heal",
          actor: player.id,
          target: target.id,
          value: healing,
          message: `${target.name} is healed for ${healing} HP`,
        });
        break;
      }
      case "buff":
      case "debuff":
      case "defend": {
        if (ability.effects) {
          applyActionEffects(player, target, ability.effects, events, currentTurn);
        }
        break;
      }
    }
  }
};

const applyActionEffects = (
  actor: Combatant,
  target: Combatant,
  effects: ActionEffect,
  events: CombatEvent[],
  turn: number,
): void => {
  if (effects.burn) {
    applyStatusEffect(target, {
      type: "burn",
      power: effects.burn,
      duration: 3,
      source: actor.id,
    });
    events.push({
      turn,
      type: "debuff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} is burning!`,
    });
  }

  if (effects.poison) {
    applyStatusEffect(target, {
      type: "poison",
      power: effects.poison,
      duration: 4,
      source: actor.id,
    });
    events.push({
      turn,
      type: "debuff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} is poisoned!`,
    });
  }

  if (effects.shield) {
    applyStatusEffect(target, {
      type: "shield",
      power: effects.shield,
      duration: 2,
      source: actor.id,
    });
    events.push({
      turn,
      type: "buff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} gains a shield!`,
    });
  }

  if (effects.regen) {
    applyStatusEffect(target, {
      type: "regen",
      power: effects.regen,
      duration: 3,
      source: actor.id,
    });
    events.push({
      turn,
      type: "buff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} begins regenerating!`,
    });
  }

  if (effects.thorns) {
    applyStatusEffect(target, {
      type: "thorns",
      power: effects.thorns,
      duration: 3,
      source: actor.id,
    });
    events.push({
      turn,
      type: "buff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} gains thorns!`,
    });
  }

  if (effects.weakness) {
    applyStatusEffect(target, {
      type: "weakness",
      power: effects.weakness,
      duration: 2,
      source: actor.id,
    });
    events.push({
      turn,
      type: "debuff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} is weakened!`,
    });
  }

  if (effects.strength) {
    applyStatusEffect(target, {
      type: "strength",
      power: effects.strength,
      duration: 2,
      source: actor.id,
    });
    events.push({
      turn,
      type: "buff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} grows stronger!`,
    });
  }

  if (effects.stun) {
    applyStatusEffect(target, {
      type: "stun",
      power: 0,
      duration: 1,
      source: actor.id,
    });
    events.push({
      turn,
      type: "debuff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} is stunned!`,
    });
  }

  if (effects.berserk) {
    applyStatusEffect(target, {
      type: "berserk",
      power: 10,
      duration: 3,
      source: actor.id,
    });
    events.push({
      turn,
      type: "buff",
      actor: actor.id,
      target: target.id,
      message: `${target.name} goes berserk! (can attack allies)`,
    });
  }
};

// ============================================================================
// Main Combat Loop
// ============================================================================

const decrementCooldowns = (combatant: Combatant): void => {
  if (combatant.type === "monster") {
    for (const [action, cooldown] of combatant.actionCooldowns.entries()) {
      if (cooldown > 0) {
        combatant.actionCooldowns.set(action, cooldown - 1);
      }
    }
  } else {
    for (const [ability, cooldown] of combatant.abilityCooldowns.entries()) {
      if (cooldown > 0) {
        combatant.abilityCooldowns.set(ability, cooldown - 1);
      }
    }
  }
};

const checkCombatEnd = (state: CombatState): CompletedCombatState | null => {
  const monster = state.combatants.get("monster");
  const alivePlayers = getAliveCombatants(state.combatants, (c) => c.type === "user");
  if (monster?.isDefeated) {
    const completedState: CompletedCombatState = {
      ...state,
      isComplete: true,
      result: "monster_captured",
      winnerUserId: null,
    };

    // Find player who dealt killing blow (last attack event targeting monster)
    for (const event of state.events) {
      if (event.type === "defeat" && event.target === "monster") {
        completedState.winnerUserId = event.actor;
        break;
      }
    }
    return completedState;
  }

  if (alivePlayers.length === 0) {
    return {
      ...state,
      isComplete: true,
      result: "all_players_defeated",
      winnerUserId: null,
    };
  }

  return null;
};

/**
 * Process a single combat turn
 * @param state Current combat state (completed states are returned as-is)
 * @param playerAbilities Available player abilities
 * @param maxTurns Maximum number of turns before monster escapes
 * @returns Updated combat state (either in progress or completed)
 */
export const processCombatTurn = (
  state: CombatState,
  playerAbilities: PlayerAbility[],
  maxTurns: number,
  random: () => number,
): CombatState => {
  if (state.isComplete) return state;

  if (state.currentTurn >= maxTurns) {
    const endState: CompletedCombatState = {
      ...state,
      isComplete: true,
      result: "monster_escaped",
      winnerUserId: null,
    };
    endState.events.push({
      turn: endState.currentTurn,
      type: "combat_end",
      actor: "system" as CombatantId,
      message: "The monster has escaped!",
    });
    return endState;
  }

  // Increment turn counter
  state.currentTurn++;

  // Add turn start event
  state.events.push({
    turn: state.currentTurn,
    type: "turn_start",
    actor: "system" as CombatantId,
    message: `--- Turn ${state.currentTurn} ---`,
  });

  // Process each combatant's action in turn order
  for (const combatantId of state.turnOrder) {
    const combatant = state.combatants.get(combatantId);
    if (!combatant || combatant.isDefeated) continue;

    // Check for stun
    const stunned = combatant.statusEffects.some((e) => e.type === "stun");
    if (stunned) {
      state.events.push({
        turn: state.currentTurn,
        type: "status_effect",
        actor: combatant.id,
        message: `${combatant.name} is stunned and cannot act!`,
      });
      continue;
    }

    // Execute action based on combatant type
    if (combatant.type === "monster") {
      const action = selectMonsterAction(combatant, random);
      if (action) {
        executeMonsterAction(state, combatant, action, random);
      }
    } else {
      const decision = selectPlayerAction(combatant, playerAbilities);
      if (decision) {
        executePlayerAction(
          state,
          combatant,
          decision.ability,
          decision.targetType,
          random,
        );
      } else {
        state.events.push({
          turn: state.currentTurn,
          type: "turn_end",
          actor: combatant.id,
          message: `${combatant.name} has no available actions and skips their turn.`,
        });
      }
    }

    // Check if combat ended after this action
    const endState = checkCombatEnd(state);
    if (endState) {
      endState.events.push({
        turn: endState.currentTurn,
        type: "combat_end",
        actor: "system" as CombatantId,
        message:
          endState.result === "monster_captured"
            ? "The monster has been captured!"
            : "All players have been defeated!",
      });
      return endState;
    }
  }

  for (const combatant of state.combatants.values()) {
    if (!combatant.isDefeated) {
      processStatusEffects(combatant, state.events, state.currentTurn);
      decrementCooldowns(combatant);
    }
  }

  // Check if combat ended after status effects
  const endState = checkCombatEnd(state);
  if (endState) {
    endState.events.push({
      turn: endState.currentTurn,
      type: "combat_end",
      actor: "system" as CombatantId,
      message:
        endState.result === "monster_captured"
          ? "The monster has been captured!"
          : "All players have been defeated!",
    });
    return endState;
  }

  // Combat continues
  return state;
};

export const initializeCombatState = (
  monster: MonsterData,
  players: PlayerData[],
): CombatState => {
  const combatants = new Map<CombatantId, Combatant>();

  combatants.set("monster", {
    type: "monster",
    id: "monster",
    name: monster.name,
    stats: {
      hp: monster.baseHp,
      maxHp: monster.baseHp,
      attack: monster.baseAttack,
      defense: monster.baseDefense,
      speed: monster.baseSpeed,
    },
    statusEffects: [],
    actionCooldowns: new Map(),
    isDefeated: false,
    availableActions: monster.actions,
  });

  // Initialize players with base stats
  for (const player of players) {
    combatants.set(player.userId, {
      type: "user",
      id: player.userId,
      name: player.username,
      stats: {
        hp: 50,
        maxHp: 50,
        attack: 8,
        defense: 3,
        speed: 60,
      },
      statusEffects: [],
      abilityCooldowns: new Map(),
      isDefeated: false,
    });
  }

  // Determine turn order (sorted by speed, descending)
  const turnOrder = Array.from(combatants.values())
    .sort((a, b) => b.stats.speed - a.stats.speed)
    .map((c) => c.id);

  return {
    combatants,
    events: [],
    currentTurn: 0,
    turnOrder,
    isComplete: false,
  };
};

/**
 * Simulate complete combat by processing turns until completion
 * @param state Initial combat state
 * @param playerAbilities Available player abilities
 * @param maxTurns Maximum number of turns before monster escapes
 * @returns Completed combat state
 */
export const simulateCombat = async (
  state: CombatState,
  playerAbilities: PlayerAbility[],
  maxTurns = 50,
  random: () => number,
): Promise<CompletedCombatState> => {
  let currentState = state;

  while (!currentState.isComplete) {
    currentState = processCombatTurn(currentState, playerAbilities, maxTurns, random);
  }

  return currentState;
};
