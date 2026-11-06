import { describe, expect, it } from "bun:test";

import {
  analyzeCurrencyReward,
  analyzeCurrencyRewardFuzzy,
  formatFixedReward,
  formatRewardPreview,
  isMuteReward,
  levenshtein,
  parseMuteDuration,
  toPersistedReward,
} from "../../src/giveaway/rewardAnalyzer";

describe("analyzeCurrencyReward", () => {
  it("parses plain points", () => {
    expect(analyzeCurrencyReward("100 punktów")).toBe(100);
    expect(analyzeCurrencyReward("50 pkt")).toBe(50);
    expect(analyzeCurrencyReward("1000pkt")).toBe(1000);
    expect(analyzeCurrencyReward("1 punkt")).toBe(1);
    expect(analyzeCurrencyReward("2 punkty")).toBe(2);
    expect(analyzeCurrencyReward("3 punktu")).toBe(3);
  });

  it("parses kapsle and k abbreviation", () => {
    expect(analyzeCurrencyReward("100 kapsle")).toBe(100);
    expect(analyzeCurrencyReward("50 k")).toBe(50);
    expect(analyzeCurrencyReward("1kapsle")).toBe(1);
    expect(analyzeCurrencyReward("1 KAPSLE")).toBe(1);
    expect(analyzeCurrencyReward("5K")).toBe(5);
  });

  it("fuzzy matches currency unit typos", () => {
    expect(analyzeCurrencyRewardFuzzy("100 kapsel")).toBe(100);
    expect(analyzeCurrencyRewardFuzzy("100 kapsli")).toBe(100);
    expect(analyzeCurrencyRewardFuzzy("100 kapse")).toBe(100);
    expect(analyzeCurrencyRewardFuzzy("100 kasel")).toBe(100);
    expect(analyzeCurrencyRewardFuzzy("50 pkt")).toBe(50);
    expect(analyzeCurrencyRewardFuzzy("50 ptk")).toBe(50);
    expect(analyzeCurrencyRewardFuzzy("10 punkt")).toBe(10);
  });

  it("returns null for fuzzy matches beyond threshold", () => {
    expect(analyzeCurrencyRewardFuzzy("100 gruszki")).toBeNull();
    expect(analyzeCurrencyRewardFuzzy("100 xyz")).toBeNull();
  });

  it("handles negatives and flexible spacing", () => {
    expect(analyzeCurrencyReward("-50 pkt")).toBe(-50);
    expect(analyzeCurrencyReward("1000  pkt")).toBe(1000);
    expect(analyzeCurrencyReward("-10 kapsle")).toBe(-10);
  });

  it("returns null for non-currency rewards", () => {
    expect(analyzeCurrencyReward("gruszki")).toBeNull();
    expect(analyzeCurrencyReward("wyciszenie 1d")).toBeNull();
    expect(analyzeCurrencyReward("100")).toBeNull();
    expect(analyzeCurrencyReward("100 gruszek")).toBeNull();
    expect(analyzeCurrencyReward("1k pkt")).toBeNull();
    expect(analyzeCurrencyReward("1m pkt")).toBeNull();
  });
});

describe("isMuteReward", () => {
  it("matches mute keywords", () => {
    expect(isMuteReward("wyciszenie 1d")).toBe(true);
    expect(isMuteReward("1d wyciszenia")).toBe(true);
    expect(isMuteReward("mute 2h")).toBe(true);
    expect(isMuteReward("muta 1d")).toBe(true);
    expect(isMuteReward("WYCISZENIE 1d")).toBe(true);
  });

  it("does not match non-mute rewards", () => {
    expect(isMuteReward("100 punktów")).toBe(false);
    expect(isMuteReward("gruszki")).toBe(false);
    expect(isMuteReward("muterka")).toBe(false);
  });
});

describe("parseMuteDuration", () => {
  it("parses durations from mute rewards", () => {
    expect(parseMuteDuration("wyciszenie 1d")).toEqual({ days: 1 });
    expect(parseMuteDuration("mute 2h")).toEqual({ hours: 2 });
    expect(parseMuteDuration("1d wyciszenia")).toEqual({ days: 1 });
    expect(parseMuteDuration("wyciszenie 1d 2h")).toEqual({
      days: 1,
      hours: 2,
    });
  });

  it("returns null when no duration present", () => {
    expect(parseMuteDuration("wyciszenie")).toBeNull();
  });
});

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("formatRewardPreview", () => {
  it("formats currency values", () => {
    expect(
      formatRewardPreview({
        reward: "100 pkt",
        amount: 2,
        type: "currency",
        parsedValue: 100,
        parsedDuration: null,
        matchedItem: null,
      }),
    ).toBe("2x 100 pkt (✅ 100 kapsle)");
  });

  it("formats mute with parsed duration", () => {
    expect(
      formatRewardPreview({
        reward: "wyciszenie 1d",
        amount: 1,
        type: "mute",
        parsedValue: null,
        parsedDuration: { days: 1 },
        matchedItem: null,
      }),
    ).toBe("1x wyciszenie 1d (✅ 1d mute)");
  });

  it("formats item with corrected name and id", () => {
    expect(
      formatRewardPreview({
        reward: "bal",
        amount: 1,
        type: "item",
        parsedValue: null,
        parsedDuration: null,
        matchedItem: { id: 3, name: "Ball" } as never,
      }),
    ).toBe("1x bal (✅ Ball id:3)");
  });

  it("formats unmatched", () => {
    expect(
      formatRewardPreview({
        reward: "nieznane",
        amount: 1,
        type: null,
        parsedValue: null,
        parsedDuration: null,
        matchedItem: null,
      }),
    ).toBe("1x nieznane (❌)");
  });
});

describe("formatFixedReward", () => {
  it("returns fixed currency text", () => {
    expect(
      formatFixedReward({
        reward: "100 pkt",
        amount: 2,
        type: "currency",
        parsedValue: 100,
        parsedDuration: null,
        matchedItem: null,
      }),
    ).toEqual({ amount: 2, reward: "100 kapsle", type: "currency" });
  });

  it("returns fixed mute text", () => {
    expect(
      formatFixedReward({
        reward: "wyciszenie 1d",
        amount: 1,
        type: "mute",
        parsedValue: null,
        parsedDuration: { days: 1 },
        matchedItem: null,
      }),
    ).toEqual({ amount: 1, reward: "1d mute", type: "mute" });
  });

  it("returns fixed item name", () => {
    expect(
      formatFixedReward({
        reward: "bal",
        amount: 1,
        type: "item",
        parsedValue: null,
        parsedDuration: null,
        matchedItem: { id: 3, name: "Ball" } as never,
      }),
    ).toEqual({ amount: 1, reward: "Ball", type: "item" });
  });

  it("returns original text when unmatched", () => {
    expect(
      formatFixedReward({
        reward: "nieznane",
        amount: 1,
        type: null,
        parsedValue: null,
        parsedDuration: null,
        matchedItem: null,
      }),
    ).toEqual({ amount: 1, reward: "nieznane", type: null });
  });
});

describe("toPersistedReward", () => {
  it("keeps original reward text when fixed=false", () => {
    const analyzed = {
      reward: "1k pkt",
      amount: 2,
      type: "currency" as const,
      parsedValue: 1000,
      parsedDuration: null,
      matchedItem: null,
    };

    expect(toPersistedReward(analyzed, false)).toEqual({
      amount: 2,
      reward: "1k pkt",
      type: "currency",
      currencyValue: 1000,
      muteDurationSeconds: null,
      itemId: null,
    });
  });

  it("uses corrected reward text when fixed=true", () => {
    const analyzed = {
      reward: "100 pkt",
      amount: 2,
      type: "currency" as const,
      parsedValue: 100,
      parsedDuration: null,
      matchedItem: null,
    };

    expect(toPersistedReward(analyzed, true)).toEqual({
      amount: 2,
      reward: "100 kapsle",
      type: "currency",
      currencyValue: 100,
      muteDurationSeconds: null,
      itemId: null,
    });
  });

  it("defaults to fixed=true when parameter omitted", () => {
    const analyzed = {
      reward: "100 pkt",
      amount: 1,
      type: "currency" as const,
      parsedValue: 100,
      parsedDuration: null,
      matchedItem: null,
    };

    expect(toPersistedReward(analyzed)).toEqual({
      amount: 1,
      reward: "100 kapsle",
      type: "currency",
      currencyValue: 100,
      muteDurationSeconds: null,
      itemId: null,
    });
  });

  it("handles mute rewards correctly", () => {
    const analyzed = {
      reward: "wyciszenie 1d",
      amount: 1,
      type: "mute" as const,
      parsedValue: null,
      parsedDuration: { days: 1 },
      matchedItem: null,
    };

    expect(toPersistedReward(analyzed, false)).toEqual({
      amount: 1,
      reward: "wyciszenie 1d",
      type: "mute",
      currencyValue: null,
      muteDurationSeconds: 86400,
      itemId: null,
    });
  });

  it("handles item rewards correctly", () => {
    const analyzed = {
      reward: "bal",
      amount: 1,
      type: "item" as const,
      parsedValue: null,
      parsedDuration: null,
      matchedItem: { id: 3, name: "Ball" } as never,
    };

    expect(toPersistedReward(analyzed, false)).toEqual({
      amount: 1,
      reward: "bal",
      type: "item",
      currencyValue: null,
      muteDurationSeconds: null,
      itemId: 3,
    });
  });
});
