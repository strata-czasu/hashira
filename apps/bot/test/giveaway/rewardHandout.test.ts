import { describe, expect, it } from "bun:test";

import { groupPendingRewards } from "../../src/giveaway/rewardHandout";

describe("groupPendingRewards", () => {
  it("groups still-pending rewards by type", () => {
    const result = groupPendingRewards(
      [
        { id: 1, type: "currency", reward: "500 pkt", winners: [{ userId: "a" }] },
        { id: 2, type: "item", reward: "Bal", winners: [{ userId: "b" }] },
        { id: 3, type: "mute", reward: "1d mute", winners: [{ userId: "c" }] },
      ] as never,
      [] as never,
    );

    expect(result.currency.map(({ reward }) => reward.reward)).toEqual(["500 pkt"]);
    expect(result.items.map(({ reward }) => reward.reward)).toEqual(["Bal"]);
    expect(result.mutes.map(({ reward }) => reward.reward)).toEqual(["1d mute"]);
  });

  it("omits rewards that were already fully distributed", () => {
    const result = groupPendingRewards(
      [
        { id: 1, type: "currency", reward: "500 pkt", winners: [{ userId: "a" }] },
        { id: 4, type: "currency", reward: "100 pkt", winners: [{ userId: "d" }] },
      ] as never,
      [{ rewardId: 4, userId: "d" }] as never,
    );

    expect(result.currency.map(({ reward }) => reward.reward)).toEqual(["500 pkt"]);
  });

  it("keeps partially distributed rewards with only the pending winners", () => {
    const result = groupPendingRewards(
      [
        {
          id: 1,
          type: "currency",
          reward: "500 pkt",
          winners: [{ userId: "a" }, { userId: "b" }],
        },
      ] as never,
      [{ rewardId: 1, userId: "a" }] as never,
    );

    expect(result.currency[0]?.pendingWinnerIds).toEqual(["b"]);
  });

  it("lists every pending winner of a reward", () => {
    const result = groupPendingRewards(
      [
        { id: 1, type: "mute", reward: "1d mute", winners: [{ userId: "a" }, { userId: "b" }] },
      ] as never,
      [] as never,
    );

    expect(result.mutes[0]?.pendingWinnerIds).toEqual(["a", "b"]);
  });

  it("skips rewards without a recognized type", () => {
    const result = groupPendingRewards(
      [{ id: 1, type: null, reward: "coś dziwnego", winners: [{ userId: "a" }] }] as never,
      [] as never,
    );

    expect(result.currency).toEqual([]);
    expect(result.items).toEqual([]);
    expect(result.mutes).toEqual([]);
  });

  it("returns empty buckets when there are no rewards", () => {
    const result = groupPendingRewards([] as never, [] as never);

    expect(result.currency).toEqual([]);
    expect(result.items).toEqual([]);
    expect(result.mutes).toEqual([]);
  });
});
