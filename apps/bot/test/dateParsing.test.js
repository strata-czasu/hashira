"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var dateParsing_1 = require("../src/util/dateParsing");
(0, bun_test_1.beforeAll)(function () {
    (0, bun_test_1.setSystemTime)(new Date("2021-09-01T00:00:00Z"));
});
(0, bun_test_1.test)("returns null if date is null or undefined", function () {
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)(null, "start", function () { return null; })).toBe(null);
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)(undefined, "start", null)).toBe(null);
});
(0, bun_test_1.test)("handles natural date in start alignment", function () {
    var now = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("now", "start", null)).toEqual(now);
    var tomorrow = new Date("2021-09-02T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("tomorrow", "start", null)).toEqual(tomorrow);
    var yesterday = new Date("2021-08-31T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("yesterday", "start", null)).toEqual(yesterday);
    var today = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("today", "start", null)).toEqual(today);
    var month = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("month", "start", null)).toEqual(month);
    var year = new Date("2021-01-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("year", "start", null)).toEqual(year);
});
(0, bun_test_1.test)("handles natural date in end alignment", function () {
    var now = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("now", "end", null)).toEqual(now);
    var tomorrow = new Date("2021-09-02T23:59:59.999Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("tomorrow", "end", null)).toEqual(tomorrow);
    var yesterday = new Date("2021-08-31T23:59:59.999Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("yesterday", "end", null)).toEqual(yesterday);
    var today = new Date("2021-09-01T23:59:59.999Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("today", "end", null)).toEqual(today);
    var month = new Date("2021-09-30T23:59:59.999Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("month", "end", null)).toEqual(month);
    var year = new Date("2021-12-31T23:59:59.999Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("year", "end", null)).toEqual(year);
});
(0, bun_test_1.test)("handles natural date in now alignment", function () {
    var now = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("now", "now", null)).toEqual(now);
    var tomorrow = new Date("2021-09-02T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("tomorrow", "now", null)).toEqual(tomorrow);
    var yesterday = new Date("2021-08-31T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("yesterday", "now", null)).toEqual(yesterday);
    var today = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("today", "now", null)).toEqual(today);
    var month = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("month", "now", null)).toEqual(month);
    var year = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("year", "now", null)).toEqual(year);
});
(0, bun_test_1.test)("returns today if date is today", function () {
    var today = new Date("2021-09-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("today", "start", null)).toEqual(today);
});
(0, bun_test_1.test)("returns tomorrow if date is tomorrow", function () {
    var tomorrow = new Date("2021-09-02T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("tomorrow", "start", null)).toEqual(tomorrow);
});
(0, bun_test_1.test)("returns month if date is month number", function () {
    var month = new Date("2021-10-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("10", "start", null)).toEqual(month);
});
(0, bun_test_1.test)("returns month if date is month name", function () {
    var month = new Date("2021-10-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("October", "start", null)).toEqual(month);
});
(0, bun_test_1.test)("returns month and day if date is month and day", function () {
    var monthDay = new Date("2021-10-10T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("10-10", "start", null)).toEqual(monthDay);
});
(0, bun_test_1.test)("returns year if date is year number", function () {
    var year = new Date("2021-01-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("2021", "start", null)).toEqual(year);
});
(0, bun_test_1.test)("returns year and month if date is year and month", function () {
    var yearMonth = new Date("2021-10-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("2021-10", "start", null)).toEqual(yearMonth);
});
(0, bun_test_1.test)("returns year, month, and day if date is year, month, and day", function () {
    var yearMonthDay = new Date("2021-10-10T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("2021-10-10", "start", null)).toEqual(yearMonthDay);
});
(0, bun_test_1.test)("returns default if date is invalid", function () {
    var def = new Date("0001-01-01T00:00:00Z");
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("invalid", "start", def)).toEqual(def);
});
(0, bun_test_1.test)("resolves default if default is a function", function () {
    var def = function () { return new Date("0001-01-01T00:00:00Z"); };
    (0, bun_test_1.expect)((0, dateParsing_1.parseDate)("invalid", "start", def)).toEqual(new Date("0001-01-01T00:00:00Z"));
});
