import { describe, expect, it } from "bun:test";

import {
  rollItemDrop,
  rollStolenItem,
  rollTrick,
  rollTrickWithDice,
  TRICK_TABLE,
} from "../../src/events/halloween2026-tot/outcomeTable";
import {
  getTotApplePassReward,
  resolveTotAnswer,
  resolveTotAppleBite,
  type TotPlayerState,
} from "../../src/events/halloween2026-tot/resolution";

const now = new Date("2026-10-31T18:00:00Z");

const player = (userId: string, overrides: Partial<TotPlayerState> = {}): TotPlayerState => ({
  userId,
  candies: 0,
  lollipopArmed: false,
  muteImmuneUntil: null,
  items: {},
  dailyMutes: 0,
  ...overrides,
});

const totalWeight = TRICK_TABLE.reduce((sum, entry) => sum + entry.weight, 0);

const pickTrick = (outcome: (typeof TRICK_TABLE)[number]["outcome"]) => {
  let before = 0;
  for (const entry of TRICK_TABLE) {
    if (entry.outcome === outcome) return (before + entry.weight / 2) / totalWeight;
    before += entry.weight;
  }
  throw new Error(`Unknown outcome ${outcome}`);
};

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++] ?? 0;
};

const resolve = (
  choice: "treat" | "trick" | "dice",
  random: () => number,
  knocker = player("a"),
  host = player("b"),
) => {
  const result = resolveTotAnswer({ knocker, host, choice, now, random });
  if (!result.ok) throw new Error(result.reason);
  return result.resolution;
};

describe("Halloween 2026 trick table", () => {
  it("has weights summing to 100", () => {
    expect(totalWeight).toBe(100);
  });

  it("maps random values onto every outcome", () => {
    for (const entry of TRICK_TABLE) {
      expect(rollTrick(() => pickTrick(entry.outcome))).toBe(entry.outcome);
    }
  });

  it("keeps the dice result that is better for the host", () => {
    const random = sequence(pickTrick("success"), pickTrick("loot"));
    expect(rollTrickWithDice(random)).toEqual({ outcome: "loot", rolls: ["success", "loot"] });
  });

  it("skips items the player already holds at the limit", () => {
    expect(rollItemDrop({ garlic: 3, broom: 3, mask: 3, dice: 3, lollipop: 3 }, () => 0)).toBe(
      "mirror",
    );
    expect(
      rollItemDrop({ garlic: 3, broom: 3, mask: 3, dice: 3, lollipop: 3, mirror: 2 }, () => 0),
    ).toBeNull();
  });

  it("only steals items the victim has and the thief can carry", () => {
    expect(rollStolenItem({ garlic: 1, mirror: 1 }, { garlic: 3 }, () => 0)).toBe("mirror");
    expect(rollStolenItem({}, {}, () => 0)).toBeNull();
  });
});

describe("resolveTotAnswer", () => {
  it("gives the knocker a candy for a treat", () => {
    const resolution = resolve("treat", () => 0);
    expect(resolution.knocker.candies).toBe(1);
    expect(resolution.mutes).toEqual([]);
  });

  it("poisons the knocker instead of giving a candy when a lollipop is armed", () => {
    const resolution = resolve("treat", () => 0, player("a"), player("b", { lollipopArmed: true }));
    expect(resolution.event).toEqual({ type: "poisoned" });
    expect(resolution.knocker.candies).toBe(0);
    expect(resolution.host.lollipopArmed).toBe(false);
    expect(resolution.mutes).toEqual([{ kind: "muted", userId: "a", minutes: 5 }]);
  });

  it("mutes the host and rewards the knocker on a successful trick", () => {
    const resolution = resolve("trick", () => pickTrick("success"));
    expect(resolution.knocker.candies).toBe(1);
    expect(resolution.mutes).toEqual([{ kind: "muted", userId: "b", minutes: 5 }]);
    expect(resolution.host.dailyMutes).toBe(1);
    expect(resolution.host.muteImmuneUntil).toEqual(new Date("2026-10-31T18:35:00Z"));
  });

  it("reflects a mute with a mirror and never reflects it twice", () => {
    const resolution = resolve(
      "trick",
      () => pickTrick("success"),
      player("a", { items: { mirror: 1 } }),
      player("b", { items: { mirror: 1 } }),
    );
    expect(resolution.mutes).toEqual([
      { kind: "reflected", userId: "b", result: { kind: "muted", userId: "a", minutes: 5 } },
    ]);
    expect(resolution.host.items.mirror).toBe(0);
    expect(resolution.knocker.items.mirror).toBe(1);
  });

  it("uses the mirror before garlic and lets garlic stop a reflected mute", () => {
    const resolution = resolve(
      "trick",
      () => pickTrick("success"),
      player("a", { items: { garlic: 1 } }),
      player("b", { items: { mirror: 1, garlic: 1 } }),
    );
    expect(resolution.mutes).toEqual([
      { kind: "reflected", userId: "b", result: { kind: "blocked", userId: "a" } },
    ]);
    expect(resolution.host.items).toEqual({ mirror: 0, garlic: 1 });
    expect(resolution.knocker.items.garlic).toBe(0);
  });

  it("spares players who are immune or reached the daily mute limit without using items", () => {
    const immune = resolve(
      "trick",
      () => pickTrick("success"),
      player("a"),
      player("b", { muteImmuneUntil: new Date("2026-10-31T18:10:00Z"), items: { garlic: 1 } }),
    );
    expect(immune.mutes).toEqual([{ kind: "spared", userId: "b" }]);
    expect(immune.host.items.garlic).toBe(1);

    const tired = resolve(
      "trick",
      () => pickTrick("success"),
      player("a"),
      player("b", { dailyMutes: 3 }),
    );
    expect(tired.mutes).toEqual([{ kind: "spared", userId: "b" }]);
  });

  it("mutes both sides for three minutes on a double trick, ignoring mirrors", () => {
    const resolution = resolve(
      "trick",
      () => pickTrick("double"),
      player("a", { items: { mirror: 1 } }),
      player("b"),
    );
    expect(resolution.mutes).toEqual([
      { kind: "muted", userId: "a", minutes: 3 },
      { kind: "muted", userId: "b", minutes: 3 },
    ]);
    expect(resolution.knocker.items.mirror).toBe(1);
  });

  it("drops an item or a candy when the pockets are full", () => {
    const loot = resolve("trick", sequence(pickTrick("loot"), 0));
    expect(loot.event).toMatchObject({ outcome: "loot", loot: "garlic" });
    expect(loot.host.items.garlic).toBe(1);

    const full = resolve(
      "trick",
      sequence(pickTrick("loot"), 0),
      player("a"),
      player("b", { items: { garlic: 3, broom: 3, mask: 3, dice: 3, lollipop: 3, mirror: 2 } }),
    );
    expect(full.event).toMatchObject({ outcome: "loot", loot: null });
    expect(full.host.candies).toBe(1);
  });

  it("steals an item, then a candy, then nothing", () => {
    const item = resolve(
      "trick",
      sequence(pickTrick("steal"), 0),
      player("a", { items: { mask: 1 } }),
    );
    expect(item.event).toMatchObject({ stolen: "mask" });
    expect(item.knocker.items.mask).toBe(0);
    expect(item.host.items.mask).toBe(1);

    const candy = resolve("trick", () => pickTrick("steal"), player("a", { candies: 2 }));
    expect(candy.event).toMatchObject({ stolen: "candy" });
    expect(candy.knocker.candies).toBe(1);
    expect(candy.host.candies).toBe(1);

    const nothing = resolve("trick", () => pickTrick("steal"));
    expect(nothing.event).toMatchObject({ stolen: null });
  });

  it("awards a golden kapsel to the host", () => {
    const golden = resolve("trick", () => pickTrick("golden"));
    expect(golden.kapselUserId).toBe("b");
    expect(golden.host.candies).toBe(0);
  });

  it("requires and consumes a dice for the dice choice", () => {
    expect(
      resolveTotAnswer({
        knocker: player("a"),
        host: player("b"),
        choice: "dice",
        now,
        random: () => 0,
      }),
    ).toEqual({
      ok: false,
      reason: "no_dice",
    });

    const resolution = resolve(
      "dice",
      sequence(pickTrick("success"), pickTrick("candies")),
      player("a"),
      player("b", { items: { dice: 1 } }),
    );
    expect(resolution.host.items.dice).toBe(0);
    expect(resolution.event).toMatchObject({ outcome: "candies", rolls: ["success", "candies"] });
    expect(resolution.host.candies).toBe(3);
  });

  it("does not mutate the input states", () => {
    const host = player("b", { items: { mirror: 1 } });
    resolve("trick", () => pickTrick("success"), player("a"), host);
    expect(host.items.mirror).toBe(1);
    expect(host.dailyMutes).toBe(0);
  });
});

describe("Halloween 2026 poisoned apple", () => {
  it("mutes the holder when the apple bites", () => {
    const bite = resolveTotAppleBite({ holder: player("a", { candies: 5 }), now });
    expect(bite.mute).toEqual({ kind: "muted", userId: "a", minutes: 5 });
    expect(bite.holder.dailyMutes).toBe(1);
    expect(bite.candiesLost).toBe(0);
  });

  it("takes candies instead of a mute from protected holders", () => {
    const immune = resolveTotAppleBite({
      holder: player("a", { candies: 5, muteImmuneUntil: new Date(now.getTime() + 60_000) }),
      now,
    });
    expect(immune.mute.kind).toBe("spared");
    expect(immune.candiesLost).toBe(3);
    expect(immune.holder.candies).toBe(2);

    const capped = resolveTotAppleBite({ holder: player("a", { candies: 1, dailyMutes: 3 }), now });
    expect(capped.candiesLost).toBe(1);
    expect(capped.holder.candies).toBe(0);
  });

  it("lets garlic block a bite without losing candies", () => {
    const bite = resolveTotAppleBite({
      holder: player("a", { candies: 5, items: { garlic: 1 } }),
      now,
    });
    expect(bite.mute.kind).toBe("blocked");
    expect(bite.holder.items.garlic).toBe(0);
    expect(bite.candiesLost).toBe(0);
  });

  it("does not let a mirror reflect a bite", () => {
    const bite = resolveTotAppleBite({ holder: player("a", { items: { mirror: 1 } }), now });
    expect(bite.mute.kind).toBe("muted");
    expect(bite.holder.items.mirror).toBe(1);
  });

  it("pays a bonus for holding the apple long", () => {
    expect(getTotApplePassReward(now, new Date(now.getTime() + 29 * 60_000))).toBe(1);
    expect(getTotApplePassReward(now, new Date(now.getTime() + 30 * 60_000))).toBe(3);
  });
});
