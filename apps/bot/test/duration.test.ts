import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Random } from "effect";
import {
  durationToSeconds,
  formatDuration,
  parseDuration,
  randomDuration,
  secondsToDuration,
} from "../src/util/duration";

// biome-ignore lint/style/noNonNullAssertion: test code
let random: () => number = null!;

beforeEach(() => {
  const randomGen = Random.make(42);
  random = () => Effect.runSync(randomGen.next);
});

describe("parseDuration", () => {
  test("returns seconds duration", () => {
    expect(parseDuration("8s")).toEqual({ seconds: 8 });
  });

  test("returns minutes duration", () => {
    expect(parseDuration("8m")).toEqual({ minutes: 8 });
  });

  test("returns hours duration", () => {
    expect(parseDuration("8h")).toEqual({ hours: 8 });
  });

  test("returns days duration", () => {
    expect(parseDuration("8d")).toEqual({ days: 8 });
  });

  test("returns null if duration is invalid", () => {
    expect(parseDuration("8x")).toBe(null);
  });

  test("returns null if duration is empty", () => {
    expect(parseDuration("")).toBe(null);
  });

  test("ignores case", () => {
    expect(parseDuration("8S")).toEqual({ seconds: 8 });
    expect(parseDuration("8M")).toEqual({ minutes: 8 });
    expect(parseDuration("8H")).toEqual({ hours: 8 });
    expect(parseDuration("8D")).toEqual({ days: 8 });
  });
});

describe("secondsToDuration", () => {
  test("converts 0 seconds to empty duration", () => {
    expect(secondsToDuration(0)).toEqual({});
  });

  test("converts seconds", () => {
    expect(secondsToDuration(1)).toEqual({ seconds: 1 });
    expect(secondsToDuration(59)).toEqual({ seconds: 59 });
  });

  test("converts minutes", () => {
    expect(secondsToDuration(60)).toEqual({ minutes: 1 });
    expect(secondsToDuration(140)).toEqual({ minutes: 2, seconds: 20 });
  });

  test("converts hours", () => {
    expect(secondsToDuration(3600)).toEqual({ hours: 1 });
    expect(secondsToDuration(7260)).toEqual({ hours: 2, minutes: 1 });
    expect(secondsToDuration(7265)).toEqual({ hours: 2, minutes: 1, seconds: 5 });
  });

  test("converts days", () => {
    expect(secondsToDuration(86400)).toEqual({ days: 1 });
    expect(secondsToDuration(176400)).toEqual({ days: 2, hours: 1 });
    expect(secondsToDuration(180060)).toEqual({ days: 2, hours: 2, minutes: 1 });
    expect(secondsToDuration(180620)).toEqual({
      days: 2,
      hours: 2,
      minutes: 10,
      seconds: 20,
    });
  });
});

describe("durationToSeconds", () => {
  test("converts seconds duration", () => {
    expect(durationToSeconds({ seconds: 8 })).toBe(8);
  });

  test("converts minutes duration", () => {
    expect(durationToSeconds({ minutes: 8 })).toBe(8 * 60);
  });

  test("converts hours duration", () => {
    expect(durationToSeconds({ hours: 8 })).toBe(8 * 60 * 60);
  });

  test("converts days duration", () => {
    expect(durationToSeconds({ days: 8 })).toBe(8 * 60 * 60 * 24);
  });

  test("converts mixed duration", () => {
    expect(durationToSeconds({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe(
      1 * 24 * 60 * 60 + 2 * 60 * 60 + 3 * 60 + 4,
    );
  });

  test("converts empty duration", () => {
    expect(durationToSeconds({})).toBe(0);
  });
});

describe("formatDuration", () => {
  test("formats seconds duration", () => {
    expect(formatDuration({ seconds: 8 })).toBe("8s");
  });

  test("formats minutes duration", () => {
    expect(formatDuration({ minutes: 8 })).toBe("8m");
  });

  test("formats hours duration", () => {
    expect(formatDuration({ hours: 8 })).toBe("8h");
  });

  test("formats days duration", () => {
    expect(formatDuration({ days: 8 })).toBe("8d");
  });

  test("formats mixed duration", () => {
    expect(formatDuration({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe(
      "1d 2h 3m 4s",
    );
  });

  test("formats empty duration", () => {
    expect(formatDuration({})).toBe("");
  });
});

describe("randomDuration", () => {
  test("generates duration within range (seconds)", () => {
    const min = { seconds: 10 };
    const max = { seconds: 20 };
    const result = randomDuration(min, max, random);

    const resultSeconds = durationToSeconds(result);
    expect(resultSeconds).toBeGreaterThanOrEqual(10);
    expect(resultSeconds).toBeLessThanOrEqual(20);
  });

  test("generates duration within range (minutes)", () => {
    const min = { minutes: 5 };
    const max = { minutes: 10 };
    const result = randomDuration(min, max, random);

    const resultSeconds = durationToSeconds(result);
    expect(resultSeconds).toBeGreaterThanOrEqual(5 * 60);
    expect(resultSeconds).toBeLessThanOrEqual(10 * 60);
  });

  test("generates duration within range (mixed durations)", () => {
    const min = { hours: 1, minutes: 30 };
    const max = { hours: 3, minutes: 45 };
    const result = randomDuration(min, max, random);

    const resultSeconds = durationToSeconds(result);
    const minSeconds = durationToSeconds(min);
    const maxSeconds = durationToSeconds(max);

    expect(resultSeconds).toBeGreaterThanOrEqual(minSeconds);
    expect(resultSeconds).toBeLessThanOrEqual(maxSeconds);
  });

  test("generates same duration when min equals max", () => {
    const duration = { hours: 2, minutes: 30 };
    const result = randomDuration(duration, duration, random);

    expect(durationToSeconds(result)).toBe(durationToSeconds(duration));
  });

  test("generates consistent results with seeded random", () => {
    const min = { seconds: 0 };
    const max = { seconds: 100 };

    const randomGen1 = Random.make(123);
    const random1 = () => Effect.runSync(randomGen1.next);
    const result1 = randomDuration(min, max, random1);

    const randomGen2 = Random.make(123);
    const random2 = () => Effect.runSync(randomGen2.next);
    const result2 = randomDuration(min, max, random2);

    expect(durationToSeconds(result1)).toBe(durationToSeconds(result2));
  });

  test("generates different results with different seeds", () => {
    const min = { seconds: 0 };
    const max = { seconds: 1000 };

    const randomGen1 = Random.make(111);
    const random1 = () => Effect.runSync(randomGen1.next);
    const result1 = randomDuration(min, max, random1);

    const randomGen2 = Random.make(222);
    const random2 = () => Effect.runSync(randomGen2.next);
    const result2 = randomDuration(min, max, random2);

    // With high probability, different seeds should produce different results
    expect(durationToSeconds(result1)).not.toBe(durationToSeconds(result2));
  });

  test("handles zero duration as minimum", () => {
    const min = { seconds: 0 };
    const max = { seconds: 10 };
    const result = randomDuration(min, max, random);

    const resultSeconds = durationToSeconds(result);
    expect(resultSeconds).toBeGreaterThanOrEqual(0);
    expect(resultSeconds).toBeLessThanOrEqual(10);
  });

  test("generates duration with days", () => {
    const min = { days: 1 };
    const max = { days: 7 };
    const result = randomDuration(min, max, random);

    const resultSeconds = durationToSeconds(result);
    expect(resultSeconds).toBeGreaterThanOrEqual(1 * 24 * 60 * 60);
    expect(resultSeconds).toBeLessThanOrEqual(7 * 24 * 60 * 60);
  });

  test("converts result to proper duration format", () => {
    const min = { seconds: 0 };
    const max = { seconds: 3665 }; // 1 hour, 1 minute, 5 seconds
    const result = randomDuration(min, max, random);

    // Result should be a valid Duration object
    expect(typeof result).toBe("object");
    // Should have at least one duration property
    const hasValidProperty =
      result.seconds !== undefined ||
      result.minutes !== undefined ||
      result.hours !== undefined ||
      result.days !== undefined;
    expect(hasValidProperty).toBe(true);
  });
});
