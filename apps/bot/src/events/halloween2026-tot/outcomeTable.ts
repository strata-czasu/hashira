import type { Halloween2026TotItem } from "@hashira/db";

import { weightedRandom } from "../../util/weightedRandom";
import { TOT_ITEM_KEYS, TOT_ITEMS } from "./constants";

export type TrickOutcome =
  | "success"
  | "backfire"
  | "loot"
  | "steal"
  | "double"
  | "candies"
  | "golden";

type TrickEntry = { readonly outcome: TrickOutcome; readonly weight: number };

export const TRICK_TABLE: readonly [TrickEntry, ...TrickEntry[]] = [
  { outcome: "success", weight: 30 },
  { outcome: "backfire", weight: 20 },
  { outcome: "loot", weight: 20 },
  { outcome: "steal", weight: 10 },
  { outcome: "double", weight: 10 },
  { outcome: "candies", weight: 7 },
  { outcome: "golden", weight: 3 },
];

const HOST_PREFERENCE = {
  success: 0,
  double: 1,
  steal: 2,
  backfire: 3,
  loot: 4,
  candies: 5,
  golden: 6,
} satisfies Record<TrickOutcome, number>;

export const rollTrick = (random: () => number): TrickOutcome =>
  weightedRandom(TRICK_TABLE, (entry) => entry.weight, random).outcome;

export const rollTrickWithDice = (random: () => number) => {
  const rolls = [rollTrick(random), rollTrick(random)] as const;
  const outcome = HOST_PREFERENCE[rolls[0]] >= HOST_PREFERENCE[rolls[1]] ? rolls[0] : rolls[1];
  return { outcome, rolls };
};

export type ItemCounts = Partial<Record<Halloween2026TotItem, number>>;

const hasRoom = (counts: ItemCounts, item: Halloween2026TotItem) =>
  (counts[item] ?? 0) < TOT_ITEMS[item].limit;

export const rollItemDrop = (counts: ItemCounts, random: () => number) =>
  weightedRandom(
    TOT_ITEM_KEYS.filter((item) => hasRoom(counts, item)),
    (item) => TOT_ITEMS[item].dropWeight,
    random,
  );

export const rollStolenItem = (
  victimCounts: ItemCounts,
  thiefCounts: ItemCounts,
  random: () => number,
) =>
  weightedRandom(
    TOT_ITEM_KEYS.filter((item) => (victimCounts[item] ?? 0) > 0 && hasRoom(thiefCounts, item)),
    (item) => TOT_ITEMS[item].dropWeight,
    random,
  );
