"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = exports.durationToMilliseconds = exports.durationToSeconds = exports.parseDuration = void 0;
/**
 * Parse a duration string into a duration object
 * @param duration The duration string to parse
 * @returns A duration object or null if the duration is invalid
 */
var parseDuration = function (duration) {
    var match = duration.match(/(\d+)([smhdSMHD])/);
    if (!match)
        return null;
    // TODO: Add support for multiple units at once
    var amount = match[1], unit = match[2];
    switch (unit === null || unit === void 0 ? void 0 : unit.toLowerCase()) {
        case "s":
            return { seconds: Number(amount) };
        case "m":
            return { minutes: Number(amount) };
        case "h":
            return { hours: Number(amount) };
        case "d":
            return { days: Number(amount) };
        default:
            return null;
    }
};
exports.parseDuration = parseDuration;
var durationToSeconds = function (duration) {
    var _a, _b, _c, _d;
    return (((_a = duration.seconds) !== null && _a !== void 0 ? _a : 0) +
        ((_b = duration.minutes) !== null && _b !== void 0 ? _b : 0) * 60 +
        ((_c = duration.hours) !== null && _c !== void 0 ? _c : 0) * 60 * 60 +
        ((_d = duration.days) !== null && _d !== void 0 ? _d : 0) * 60 * 60 * 24);
};
exports.durationToSeconds = durationToSeconds;
var durationToMilliseconds = function (duration) {
    return (0, exports.durationToSeconds)(duration) * 1000;
};
exports.durationToMilliseconds = durationToMilliseconds;
var formatDuration = function (duration) {
    var parts = [];
    if (duration.years)
        parts.push("".concat(duration.years, "y"));
    if (duration.months)
        parts.push("".concat(duration.months, "mo"));
    if (duration.days)
        parts.push("".concat(duration.days, "d"));
    if (duration.hours)
        parts.push("".concat(duration.hours, "h"));
    if (duration.minutes)
        parts.push("".concat(duration.minutes, "m"));
    if (duration.seconds)
        parts.push("".concat(duration.seconds, "s"));
    return parts.join(" ");
};
exports.formatDuration = formatDuration;
