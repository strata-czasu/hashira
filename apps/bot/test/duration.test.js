"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var duration_1 = require("../src/util/duration");
(0, bun_test_1.describe)("parseDuration", function () {
    (0, bun_test_1.test)("returns seconds duration", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8s")).toEqual({ seconds: 8 });
    });
    (0, bun_test_1.test)("returns minutes duration", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8m")).toEqual({ minutes: 8 });
    });
    (0, bun_test_1.test)("returns hours duration", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8h")).toEqual({ hours: 8 });
    });
    (0, bun_test_1.test)("returns days duration", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8d")).toEqual({ days: 8 });
    });
    (0, bun_test_1.test)("returns null if duration is invalid", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8x")).toBe(null);
    });
    (0, bun_test_1.test)("returns null if duration is empty", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("")).toBe(null);
    });
    (0, bun_test_1.test)("ignores case", function () {
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8S")).toEqual({ seconds: 8 });
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8M")).toEqual({ minutes: 8 });
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8H")).toEqual({ hours: 8 });
        (0, bun_test_1.expect)((0, duration_1.parseDuration)("8D")).toEqual({ days: 8 });
    });
});
(0, bun_test_1.describe)("durationToSeconds", function () {
    (0, bun_test_1.test)("converts seconds duration", function () {
        (0, bun_test_1.expect)((0, duration_1.durationToSeconds)({ seconds: 8 })).toBe(8);
    });
    (0, bun_test_1.test)("converts minutes duration", function () {
        (0, bun_test_1.expect)((0, duration_1.durationToSeconds)({ minutes: 8 })).toBe(8 * 60);
    });
    (0, bun_test_1.test)("converts hours duration", function () {
        (0, bun_test_1.expect)((0, duration_1.durationToSeconds)({ hours: 8 })).toBe(8 * 60 * 60);
    });
    (0, bun_test_1.test)("converts days duration", function () {
        (0, bun_test_1.expect)((0, duration_1.durationToSeconds)({ days: 8 })).toBe(8 * 60 * 60 * 24);
    });
    (0, bun_test_1.test)("converts mixed duration", function () {
        (0, bun_test_1.expect)((0, duration_1.durationToSeconds)({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe(1 * 24 * 60 * 60 + 2 * 60 * 60 + 3 * 60 + 4);
    });
    (0, bun_test_1.test)("converts empty duration", function () {
        (0, bun_test_1.expect)((0, duration_1.durationToSeconds)({})).toBe(0);
    });
});
(0, bun_test_1.describe)("formatDuration", function () {
    (0, bun_test_1.test)("formats seconds duration", function () {
        (0, bun_test_1.expect)((0, duration_1.formatDuration)({ seconds: 8 })).toBe("8s");
    });
    (0, bun_test_1.test)("formats minutes duration", function () {
        (0, bun_test_1.expect)((0, duration_1.formatDuration)({ minutes: 8 })).toBe("8m");
    });
    (0, bun_test_1.test)("formats hours duration", function () {
        (0, bun_test_1.expect)((0, duration_1.formatDuration)({ hours: 8 })).toBe("8h");
    });
    (0, bun_test_1.test)("formats days duration", function () {
        (0, bun_test_1.expect)((0, duration_1.formatDuration)({ days: 8 })).toBe("8d");
    });
    (0, bun_test_1.test)("formats mixed duration", function () {
        (0, bun_test_1.expect)((0, duration_1.formatDuration)({ days: 1, hours: 2, minutes: 3, seconds: 4 })).toBe("1d 2h 3m 4s");
    });
    (0, bun_test_1.test)("formats empty duration", function () {
        (0, bun_test_1.expect)((0, duration_1.formatDuration)({})).toBe("");
    });
});
