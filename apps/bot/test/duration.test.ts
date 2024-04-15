import { describe, expect, test } from "bun:test";
import { durationToSeconds, parseDuration } from "../src/util/duration";

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
