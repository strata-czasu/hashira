import { beforeAll, expect, setSystemTime, test } from "bun:test";
import { parseDate } from "../src/dateParsing";

beforeAll(() => {
	setSystemTime(new Date("2021-09-01T00:00:00Z"));
});

test("returns null if date is null or undefined", () => {
	expect(parseDate(null, "start", () => null)).toBe(null);
	expect(parseDate(undefined, "start", null)).toBe(null);
});

test("handles natural date in start alignment", () => {
	const now = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("now", "start", null)).toEqual(now);

	const tomorrow = new Date("2021-09-02T00:00:00Z");
	expect(parseDate("tomorrow", "start", null)).toEqual(tomorrow);

	const yesterday = new Date("2021-08-31T00:00:00Z");
	expect(parseDate("yesterday", "start", null)).toEqual(yesterday);

	const today = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("today", "start", null)).toEqual(today);

	const month = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("month", "start", null)).toEqual(month);

	const year = new Date("2021-01-01T00:00:00Z");
	expect(parseDate("year", "start", null)).toEqual(year);
});

test("handles natural date in end alignment", () => {
	const now = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("now", "end", null)).toEqual(now);

	const tomorrow = new Date("2021-09-02T23:59:59.999Z");
	expect(parseDate("tomorrow", "end", null)).toEqual(tomorrow);

	const yesterday = new Date("2021-08-31T23:59:59.999Z");
	expect(parseDate("yesterday", "end", null)).toEqual(yesterday);

	const today = new Date("2021-09-01T23:59:59.999Z");
	expect(parseDate("today", "end", null)).toEqual(today);

	const month = new Date("2021-09-30T23:59:59.999Z");
	expect(parseDate("month", "end", null)).toEqual(month);

	const year = new Date("2021-12-31T23:59:59.999Z");
	expect(parseDate("year", "end", null)).toEqual(year);
});

test("handles natural date in now alignment", () => {
	const now = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("now", "now", null)).toEqual(now);

	const tomorrow = new Date("2021-09-02T00:00:00Z");
	expect(parseDate("tomorrow", "now", null)).toEqual(tomorrow);

	const yesterday = new Date("2021-08-31T00:00:00Z");
	expect(parseDate("yesterday", "now", null)).toEqual(yesterday);

	const today = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("today", "now", null)).toEqual(today);

	const month = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("month", "now", null)).toEqual(month);

	const year = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("year", "now", null)).toEqual(year);
});

test("returns today if date is today", () => {
	const today = new Date("2021-09-01T00:00:00Z");
	expect(parseDate("today", "start", null)).toEqual(today);
});

test("returns tomorrow if date is tomorrow", () => {
	const tomorrow = new Date("2021-09-02T00:00:00Z");
	expect(parseDate("tomorrow", "start", null)).toEqual(tomorrow);
});

test("returns month if date is month number", () => {
	const month = new Date("2021-10-01T00:00:00Z");
	expect(parseDate("10", "start", null)).toEqual(month);
});

test("returns month if date is month name", () => {
	const month = new Date("2021-10-01T00:00:00Z");
	expect(parseDate("October", "start", null)).toEqual(month);
});

test("returns month and day if date is month and day", () => {
	const monthDay = new Date("2021-10-10T00:00:00Z");
	expect(parseDate("10-10", "start", null)).toEqual(monthDay);
});

test("returns year if date is year number", () => {
	const year = new Date("2021-01-01T00:00:00Z");
	expect(parseDate("2021", "start", null)).toEqual(year);
});

test("returns year and month if date is year and month", () => {
	const yearMonth = new Date("2021-10-01T00:00:00Z");
	expect(parseDate("2021-10", "start", null)).toEqual(yearMonth);
});

test("returns year, month, and day if date is year, month, and day", () => {
	const yearMonthDay = new Date("2021-10-10T00:00:00Z");
	expect(parseDate("2021-10-10", "start", null)).toEqual(yearMonthDay);
});

test("returns default if date is invalid", () => {
	const def = new Date("0001-01-01T00:00:00Z");
	expect(parseDate("invalid", "start", def)).toEqual(def);
});

test("resolves default if default is a function", () => {
	const def = () => new Date("0001-01-01T00:00:00Z");
	expect(parseDate("invalid", "start", def)).toEqual(new Date("0001-01-01T00:00:00Z"));
});
