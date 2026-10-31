import { addMinutes } from "date-fns";

import type { Halloween2026TotItem } from "@hashira/db";

import {
  TOT_APPLE_BITE_MINUTES,
  TOT_APPLE_LONG_HOLD_BONUS,
  TOT_APPLE_LONG_HOLD_MINUTES,
  TOT_APPLE_PASS_REWARD,
  TOT_APPLE_SPARED_CANDY_LOSS,
  TOT_DAILY_MUTE_LIMIT,
  TOT_DOUBLE_MUTE_MINUTES,
  TOT_MUTE_IMMUNITY_MINUTES,
  TOT_MUTE_MINUTES,
} from "./constants";
import {
  type ItemCounts,
  rollItemDrop,
  rollStolenItem,
  rollTrick,
  rollTrickWithDice,
  type TrickOutcome,
} from "./outcomeTable";

export type TotPlayerState = {
  userId: string;
  candies: number;
  lollipopArmed: boolean;
  muteImmuneUntil: Date | null;
  items: ItemCounts;
  dailyMutes: number;
};

export type TotAnswerChoice = "treat" | "trick" | "dice";

export type TotMuteResolution =
  | { kind: "muted"; userId: string; minutes: number }
  | { kind: "blocked"; userId: string }
  | { kind: "spared"; userId: string }
  | { kind: "reflected"; userId: string; result: TotMuteResolution };

export type TotTrickEvent = {
  type: "trick";
  outcome: TrickOutcome;
  rolls: readonly [TrickOutcome, TrickOutcome] | null;
  loot: Halloween2026TotItem | null;
  stolen: Halloween2026TotItem | "candy" | null;
};

export type TotAnswerEvent = { type: "treat" } | { type: "poisoned" } | TotTrickEvent;

export type TotAnswerResolution = {
  knocker: TotPlayerState;
  host: TotPlayerState;
  event: TotAnswerEvent;
  mutes: TotMuteResolution[];
  kapselUserId: string | null;
};

const addItem = (player: TotPlayerState, item: Halloween2026TotItem, amount: number) => {
  player.items[item] = (player.items[item] ?? 0) + amount;
};

const isProtected = (player: TotPlayerState, now: Date) =>
  (player.muteImmuneUntil !== null && player.muteImmuneUntil > now) ||
  player.dailyMutes >= TOT_DAILY_MUTE_LIMIT;

const resolveMute = (
  target: TotPlayerState,
  source: TotPlayerState,
  minutes: number,
  now: Date,
  canReflect: boolean,
): TotMuteResolution => {
  if (isProtected(target, now)) return { kind: "spared", userId: target.userId };

  if (canReflect && (target.items.mirror ?? 0) > 0) {
    addItem(target, "mirror", -1);
    return {
      kind: "reflected",
      userId: target.userId,
      result: resolveMute(source, target, minutes, now, false),
    };
  }

  if ((target.items.garlic ?? 0) > 0) {
    addItem(target, "garlic", -1);
    return { kind: "blocked", userId: target.userId };
  }

  target.dailyMutes += 1;
  target.muteImmuneUntil = addMinutes(now, minutes + TOT_MUTE_IMMUNITY_MINUTES);
  return { kind: "muted", userId: target.userId, minutes };
};

export const resolveTotAnswer = (input: {
  knocker: TotPlayerState;
  host: TotPlayerState;
  choice: TotAnswerChoice;
  now: Date;
  random: () => number;
}): { ok: true; resolution: TotAnswerResolution } | { ok: false; reason: "no_dice" } => {
  const knocker = structuredClone(input.knocker);
  const host = structuredClone(input.host);
  const { now, random } = input;
  const mutes: TotMuteResolution[] = [];
  const done = (event: TotAnswerEvent, kapselUserId: string | null = null) =>
    ({ ok: true, resolution: { knocker, host, event, mutes, kapselUserId } }) as const;

  if (input.choice === "treat") {
    if (host.lollipopArmed) {
      host.lollipopArmed = false;
      mutes.push(resolveMute(knocker, host, TOT_MUTE_MINUTES, now, true));
      return done({ type: "poisoned" });
    }
    knocker.candies += 1;
    return done({ type: "treat" });
  }

  let outcome: TrickOutcome;
  let rolls: readonly [TrickOutcome, TrickOutcome] | null = null;
  if (input.choice === "dice") {
    if ((host.items.dice ?? 0) <= 0) return { ok: false, reason: "no_dice" };
    addItem(host, "dice", -1);
    ({ outcome, rolls } = rollTrickWithDice(random));
  } else {
    outcome = rollTrick(random);
  }

  const trick: TotTrickEvent = {
    type: "trick",
    outcome,
    rolls,
    loot: null,
    stolen: null,
  };

  switch (outcome) {
    case "success":
      knocker.candies += 1;
      mutes.push(resolveMute(host, knocker, TOT_MUTE_MINUTES, now, true));
      return done(trick);
    case "backfire":
      host.candies += 1;
      mutes.push(resolveMute(knocker, host, TOT_MUTE_MINUTES, now, true));
      return done(trick);
    case "double":
      mutes.push(resolveMute(knocker, host, TOT_DOUBLE_MUTE_MINUTES, now, false));
      mutes.push(resolveMute(host, knocker, TOT_DOUBLE_MUTE_MINUTES, now, false));
      return done(trick);
    case "loot": {
      const item = rollItemDrop(host.items, random);
      if (item) addItem(host, item, 1);
      else host.candies += 1;
      trick.loot = item;
      return done(trick);
    }
    case "steal": {
      const item = rollStolenItem(knocker.items, host.items, random);
      if (item) {
        addItem(knocker, item, -1);
        addItem(host, item, 1);
        trick.stolen = item;
      } else if (knocker.candies > 0) {
        knocker.candies -= 1;
        host.candies += 1;
        trick.stolen = "candy";
      }
      return done(trick);
    }
    case "candies":
      host.candies += 3;
      return done(trick);
    case "golden":
      return done(trick, host.userId);
  }
};

export type TotAppleBiteResolution = {
  holder: TotPlayerState;
  mute: TotMuteResolution;
  candiesLost: number;
};

export const resolveTotAppleBite = (input: {
  holder: TotPlayerState;
  now: Date;
}): TotAppleBiteResolution => {
  const holder = structuredClone(input.holder);
  const mute = resolveMute(holder, holder, TOT_APPLE_BITE_MINUTES, input.now, false);
  const candiesLost =
    mute.kind === "spared" ? Math.min(holder.candies, TOT_APPLE_SPARED_CANDY_LOSS) : 0;
  holder.candies -= candiesLost;
  return { holder, mute, candiesLost };
};

export const getTotApplePassReward = (receivedAt: Date, now: Date) =>
  TOT_APPLE_PASS_REWARD +
  (now.getTime() - receivedAt.getTime() >= TOT_APPLE_LONG_HOLD_MINUTES * 60_000
    ? TOT_APPLE_LONG_HOLD_BONUS
    : 0);
