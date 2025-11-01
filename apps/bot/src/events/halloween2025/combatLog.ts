import type { $Enums } from "@hashira/db";
import { sumBy } from "es-toolkit";
import { weightedRandom } from "../../util/weightedRandom";
import type { MonsterData, PlayerData, StatsModifiers } from "./combatRepository";
export type CombatantId = "monster" | (string & {});

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

export type CombatantSnapshot = {
  id: CombatantId;
  name: string;
  stats: CombatStats;
  isDefeated: boolean;
  statusEffects: StatusEffect[];
};

export type TurnSnapshot = {
  turnNumber: number;
  combatants: CombatantSnapshot[];
  events: CombatEvent[];
};

export type InProgresCombatState = {
  combatants: Map<CombatantId, Combatant>;
  events: CombatEvent[];
  currentTurn: number;
  turnOrder: CombatantId[];
  turnSnapshots: TurnSnapshot[];
  isComplete: false;
  result?: undefined;
};

export type CompletedCombatState = {
  combatants: Map<CombatantId, Combatant>;
  events: CombatEvent[];
  currentTurn: number;
  turnOrder: CombatantId[];
  turnSnapshots: TurnSnapshot[];
  isComplete: true;
  result: $Enums.Halloween2025CombatResult;
};

export type CombatState = InProgresCombatState | CompletedCombatState;

const STAT_CAPS = {
  maxHp: 1500,
  attack: 20,
  defense: 15,
  speed: 200,
} as const;

const applyModifiers = (stats: CombatStats, modifiers: StatsModifiers): CombatStats => {
  let maxHp = stats.maxHp + (modifiers.hpBonus ?? 0);
  let attack = stats.attack + (modifiers.attackBonus ?? 0);
  let defense = stats.defense + (modifiers.defenseBonus ?? 0);
  let speed = stats.speed + (modifiers.speedBonus ?? 0);

  maxHp = maxHp * (1 + (modifiers.hpMultiplier ?? 0));
  attack = attack * (1 + (modifiers.attackMultiplier ?? 0));
  defense = defense * (1 + (modifiers.defenseMultiplier ?? 0));
  speed = speed * (1 + (modifiers.speedMultiplier ?? 0));

  maxHp = Math.min(Math.round(maxHp), STAT_CAPS.maxHp);
  attack = Math.min(Math.round(attack), STAT_CAPS.attack);
  defense = Math.min(Math.round(defense), STAT_CAPS.defense);
  speed = Math.min(Math.round(speed), STAT_CAPS.speed);

  return { hp: maxHp, maxHp, attack, defense, speed };
};

const calculateDamage = (
  attacker: Combatant,
  target: Combatant,
  basePower: number,
  isCritical: boolean,
): number => {
  let damage = basePower + attacker.stats.attack - target.stats.defense;

  const strengthBuff = sumBy(
    attacker.statusEffects.filter((e) => e.type === "strength"),
    (e) => e.power,
  );
  if (strengthBuff) damage += strengthBuff;

  const weaknessDebuff = sumBy(
    attacker.statusEffects.filter((e) => e.type === "weakness"),
    (e) => e.power,
  );
  if (weaknessDebuff) damage -= weaknessDebuff;

  const shield = sumBy(
    target.statusEffects.filter((e) => e.type === "shield"),
    (e) => e.power,
  );
  if (shield) {
    damage = Math.max(0, damage - shield);
  }

  if (isCritical) damage = Math.floor(damage * 1.5);

  return Math.max(0, Math.floor(damage));
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
  const existingEffect = target.statusEffects.find(
    (e) => e.type === effect.type && e.source === effect.source,
  );

  if (existingEffect) {
    existingEffect.power += effect.power;
    existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
  } else {
    target.statusEffects.push(effect);
  }
};

const translatedStatusEffect = (effect: StatusEffect) => {
  switch (effect.type) {
    case "burn":
      return "podpalenie";
    case "poison":
      return "trucizna";
    case "stun":
      return "ogłuszenie";
    case "shield":
      return "tarcza";
    case "regen":
      return "regeneracja";
    case "berserk":
      return "szał";
    case "thorns":
      return "kolce";
    case "weakness":
      return "osłabienie";
    case "strength":
      return "siła";
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
          message: `${combatant.name} otrzymuje ${damage} obrażeń od efektu ${translatedStatusEffect(effect)}`,
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
            message: `${combatant.name} regeneruje ${healing} HP`,
          });
        }
        break;
      }
      case "thorns": {
        break;
      }
    }

    effect.duration--;
    // effect.power--;
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
    message: `${monster.name} korzysta z akcji ${action.name}!`,
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

  for (const target of targets) {
    switch (action.actionType) {
      case "attack": {
        if (rollDodge(target, random)) {
          events.push({
            turn: currentTurn,
            type: "dodge",
            actor: monster.id,
            target: target.id,
            message: `${target.name} unika ataku!`,
          });
          continue;
        }

        const isCritical = rollCritical(random);
        const damage = calculateDamage(monster, target, action.power, isCritical);
        applyDamage(target, damage);

        if (action.effects?.lifesteal) {
          const lifesteal = Math.floor(damage * action.effects.lifesteal);
          applyHealing(monster, lifesteal);
          events.push({
            turn: currentTurn,
            type: "heal",
            actor: monster.id,
            target: monster.id,
            value: lifesteal,
            message: `${monster.name} kradnie ${lifesteal} HP`,
          });
        }

        events.push({
          turn: currentTurn,
          type: isCritical ? "critical" : "attack",
          actor: monster.id,
          target: target.id,
          value: damage,
          message: `${target.name} otrzymuje ${damage} obrażeń${isCritical ? " (KRYTYK!)" : ""}`,
        });

        if (action.effects) {
          applyActionEffects(monster, target, action.effects, events, currentTurn);
        }

        if (target.isDefeated) {
          events.push({
            turn: currentTurn,
            type: "defeat",
            actor: monster.id,
            target: target.id,
            message: `${target.name} nie może walczyć!`,
          });
        }
        break;
      }
      case "heal": {
        const healing = applyHealing(target, action.power);
        events.push({
          turn: currentTurn,
          type: "heal",
          actor: monster.id,
          target: target.id,
          value: healing,
          message: `${target.name} otrzymuje leczenie za ${healing} HP`,
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
    message: `${player.name} korzysta z umiejętności ${ability.name}!`,
  });

  // Set cooldown
  player.abilityCooldowns.set(ability.name, ability.cooldown);

  let targets: Combatant[] = [];
  // biome-ignore lint/style/noNonNullAssertion: monster must exist
  const monster = combatants.get("monster")!;
  const alivePlayers = getAliveCombatants(combatants, (c) => c.type === "user");

  if (ability.isAoe || player.statusEffects.find((e) => e.type === "berserk")) {
    targets = [...alivePlayers];

    if (ability.abilityType !== "heal" && ability.abilityType !== "buff") {
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
            message: `${target.name} unika ataku!`,
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
            message: `${player.name} kradnie ${lifesteal} HP`,
          });
        }

        events.push({
          turn: currentTurn,
          type: isCritical ? "critical" : "attack",
          actor: player.id,
          target: target.id,
          value: damage,
          message: `${target.name} otrzymuje ${damage} obrażeń${isCritical ? " (KRYTYK!)" : ""}`,
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
            message: `${target.name} traci przytomność!`,
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
          message: `${target.name} otrzymuje leczenie za ${healing} HP`,
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
      message: `${target.name} zaczyna płonąć!`,
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
      message: `${target.name} dostaje truciznę!`,
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
      message: `${target.name} zyskuje tarczę!`,
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
      message: `${target.name} regeneruje się!`,
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
      message: `${target.name} zyskuje kolce!`,
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
      message: `${target.name} otrzymuje osłabienie!`,
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
      message: `${target.name} rośnie w siłę!`,
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
      message: `${target.name} dostaje ogłuszenie!`,
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
      message: `${target.name} wpada w szał! (może atakować sojuszników)`,
    });
  }
};

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

const createTurnSnapshot = (
  state: CombatState,
  turnEvents: CombatEvent[],
): TurnSnapshot => {
  const combatantSnapshots: CombatantSnapshot[] = [];

  for (const combatant of state.combatants.values()) {
    combatantSnapshots.push({
      id: combatant.id,
      name: combatant.name,
      stats: { ...combatant.stats },
      isDefeated: combatant.isDefeated,
      statusEffects: [...combatant.statusEffects], // ensure not to share reference
    });
  }

  return {
    turnNumber: state.currentTurn,
    combatants: combatantSnapshots,
    events: turnEvents,
  };
};

const checkCombatEnd = (state: CombatState): CompletedCombatState | null => {
  const monster = state.combatants.get("monster");
  const alivePlayers = getAliveCombatants(state.combatants, (c) => c.type === "user");
  if (monster?.isDefeated) {
    return {
      ...state,
      isComplete: true,
      result: "monster_captured",
    };
  }

  if (alivePlayers.length === 0) {
    return {
      ...state,
      isComplete: true,
      result: "all_players_defeated",
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
    };
    endState.events.push({
      turn: endState.currentTurn,
      type: "combat_end",
      actor: "system" as CombatantId,
      message: "Potwór uciekł!",
    });
    return endState;
  }

  state.currentTurn++;
  const turnStartEventIndex = state.events.length;

  for (const combatantId of state.turnOrder) {
    const combatant = state.combatants.get(combatantId);
    if (!combatant || combatant.isDefeated) continue;

    const stunned = combatant.statusEffects.some((e) => e.type === "stun");
    if (stunned) {
      state.events.push({
        turn: state.currentTurn,
        type: "status_effect",
        actor: combatant.id,
        message: `${combatant.name} ma efekt ogłuszenia i nie może nic zrobić!`,
      });
      continue;
    }

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
          message: `${combatant.name} nie ma dostępnych akcji i pomija swoją turę.`,
        });
      }
    }

    const endState = checkCombatEnd(state);
    if (endState) {
      endState.events.push({
        turn: endState.currentTurn,
        type: "combat_end",
        actor: "system" as CombatantId,
        message:
          endState.result === "monster_captured"
            ? "Potwór został schwytany!"
            : "Wszyscy gracze zostali pokonani!",
      });

      const turnEvents = endState.events.slice(turnStartEventIndex);
      const snapshot = createTurnSnapshot(endState, turnEvents);
      endState.turnSnapshots.push(snapshot);

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
          ? "Potwór został schwytany!"
          : "Wszyscy gracze zostali pokonani!",
    });

    const turnEvents = endState.events.slice(turnStartEventIndex);
    const snapshot = createTurnSnapshot(endState, turnEvents);
    endState.turnSnapshots.push(snapshot);

    return endState;
  }

  const turnEvents = state.events.slice(turnStartEventIndex);
  const snapshot = createTurnSnapshot(state, turnEvents);
  state.turnSnapshots.push(snapshot);

  return state;
};

const rarityMultipliers = {
  common: 0,
  uncommon: 0.2,
  rare: 0.5,
  epic: 1,
  legendary: 2,
} satisfies Record<$Enums.Halloween2025MonsterRarity, number>;

export const initializeCombatState = (
  monster: MonsterData,
  players: PlayerData[],
  userNameMap?: Map<string, string>,
): CombatState => {
  const combatants = new Map<CombatantId, Combatant>();
  const multiplier = rarityMultipliers[monster.rarity];

  const monsterBaseStats = {
    hp: monster.baseHp,
    maxHp: monster.baseHp,
    attack: monster.baseAttack,
    defense: monster.baseDefense,
    speed: monster.baseSpeed,
  };

  const monsterModifiers: StatsModifiers = {
    hpBonus: players.length * 50,
    hpMultiplier: multiplier,
    attackBonus: players.length / 4,
    attackMultiplier: multiplier / 2,
    defenseBonus: players.length / 4,
    defenseMultiplier: multiplier / 2,
  };

  combatants.set("monster", {
    type: "monster",
    id: "monster",
    name: monster.name,
    stats: applyModifiers(monsterBaseStats, monsterModifiers),
    statusEffects: [],
    actionCooldowns: new Map(),
    isDefeated: false,
    availableActions: monster.actions,
  });

  for (const player of players) {
    const displayName = userNameMap?.get(player.userId) ?? player.username;

    const baseStats = { hp: 50, maxHp: 50, attack: 8, defense: 3, speed: 50 };

    combatants.set(player.userId, {
      type: "user",
      id: player.userId,
      name: displayName,
      stats: applyModifiers(baseStats, player.modifiers),
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
    turnSnapshots: [],
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
export const simulateCombat = (
  state: CombatState,
  playerAbilities: PlayerAbility[],
  maxTurns = 50,
  random: () => number,
): CompletedCombatState => {
  let currentState = state;

  state.turnSnapshots.push(createTurnSnapshot(state, []));

  while (!currentState.isComplete) {
    currentState = processCombatTurn(currentState, playerAbilities, maxTurns, random);
  }

  return currentState;
};
