"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = exports.durationToMilliseconds = exports.durationToSeconds = exports.parseDuration = void 0;
/**
 * Parse a duration string into a duration object
 * @param duration The duration string to parse
 * @returns A duration object or null if the duration is invalid
 */
var parseDuration = function (input) {
    var _a;
    var trimmed = input.trim();
    var globalSign = trimmed.startsWith("-") ? -1 : 1;
    var re = /([+-]?)(\d+)\s*([smhd])/gi;
    var unitMap = {
        s: "seconds",
        m: "minutes",
        h: "hours",
        d: "days",
    };
    var out = {};
    for (var _i = 0, _b = trimmed.matchAll(re); _i < _b.length; _i++) {
        var _c = _b[_i], signChar = _c[1], value = _c[2], unit = _c[3];
        if (!value || !unit)
            return null;
        var sign = signChar === "-" ? -1 : signChar === "+" ? 1 : globalSign;
        var key = unitMap[unit.toLowerCase()];
        var val = sign * Number.parseInt(value, 10);
        if (!key || Number.isNaN(val))
            return null; // parsing went wrong
        out[key] = ((_a = out[key]) !== null && _a !== void 0 ? _a : 0) + val;
    }
    return Object.keys(out).length > 0 ? out : null;
};
exports.parseDuration = parseDuration;
var durationToSeconds = function (duration) {
    var _a, _b, _c, _d, _e, _f, _g;
    return (((_a = duration.seconds) !== null && _a !== void 0 ? _a : 0) +
        ((_b = duration.minutes) !== null && _b !== void 0 ? _b : 0) * 60 +
        ((_c = duration.hours) !== null && _c !== void 0 ? _c : 0) * 60 * 60 +
        ((_d = duration.days) !== null && _d !== void 0 ? _d : 0) * 60 * 60 * 24 +
        ((_e = duration.weeks) !== null && _e !== void 0 ? _e : 0) * 60 * 60 * 24 * 7 +
        ((_f = duration.months) !== null && _f !== void 0 ? _f : 0) * 60 * 60 * 24 * 30 +
        ((_g = duration.years) !== null && _g !== void 0 ? _g : 0) * 60 * 60 * 24 * 365);
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
    if (duration.weeks)
        parts.push("".concat(duration.weeks, "w"));
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
