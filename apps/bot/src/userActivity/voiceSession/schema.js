"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.voiceSessionSchema = exports.AnyVersionVoiceSessionSchema = void 0;
var range_1 = require("@hashira/utils/range");
var v = require("valibot");
var BooleanString = v.pipe(v.string(), v.union([v.literal("true"), v.literal("false")]), v.transform(function (v) { return v === "true"; }));
var NumberString = v.pipe(v.string(), v.decimal(), v.transform(function (v) { return Number(v); }));
var DateString = v.pipe(v.string(), v.isoTimestamp(), v.transform(function (v) { return new Date(v); }));
var StateString = v.pipe(v.union((0, range_1.range)(0, 32).map(function (i) { return v.literal("".concat(i)); })), v.transform(function (v) { return Number(v); }));
var voiceSessionSchemaV1 = v.object({
    channelId: v.string(),
    joinedAt: DateString,
    lastUpdate: DateString,
    isMuted: BooleanString,
    isDeafened: BooleanString,
    isStreaming: BooleanString,
    isVideo: BooleanString,
    totalDeafenedSeconds: NumberString,
    totalMutedSeconds: NumberString,
    totalStreamingSeconds: NumberString,
    totalVideoSeconds: NumberString,
    version: v.literal("1"),
});
var voiceSessionSchemaV2 = v.object({
    channelId: v.string(),
    joinedAt: DateString,
    lastUpdate: DateString,
    isMuted: BooleanString,
    isDeafened: BooleanString,
    isStreaming: BooleanString,
    isVideo: BooleanString,
    totalDeafenedSeconds: NumberString,
    totalMutedSeconds: NumberString,
    totalStreamingSeconds: NumberString,
    totalActiveStreamingSeconds: NumberString,
    totalVideoSeconds: NumberString,
    totalActiveVideoSeconds: NumberString,
    version: v.literal("2"),
});
var voiceSessionSchemaV3 = v.object(__assign(__assign({ channelId: v.string(), joinedAt: DateString, lastUpdate: DateString, state: StateString }, (0, range_1.rangeObject)(0, 32, function () { return v.exactOptional(NumberString); }, function (i) { return "total_".concat(i); })), { version: v.literal("3") }));
exports.AnyVersionVoiceSessionSchema = v.union([
    voiceSessionSchemaV1,
    voiceSessionSchemaV2,
    voiceSessionSchemaV3,
]);
exports.voiceSessionSchema = voiceSessionSchemaV3;
exports.VERSION = "3";
