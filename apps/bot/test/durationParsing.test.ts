import { expect, test } from "bun:test";
import { parseDuration } from "../src/util/durationParsing";

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
