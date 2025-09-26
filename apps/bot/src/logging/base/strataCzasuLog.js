"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strataCzasuLog = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var duration_1 = require("../../util/duration");
var logger_1 = require("./logger");
var util_1 = require("./util");
exports.strataCzasuLog = new core_1.Hashira({ name: "strataCzasuLog" }).const("strataCzasuLog", new logger_1.Logger()
    .addMessageType("ultimatumStart", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var user = _d.user, createdAt = _d.createdAt, expiresAt = _d.expiresAt, reason = _d.reason;
    return __generator(this, function (_e) {
        content = [
            (0, discord_js_1.bold)("Rozpoczyna ultimatum"),
            "Poczatek: ".concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Koniec: ".concat((0, discord_js_1.time)(expiresAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Pow\u00F3d: ".concat((0, discord_js_1.italic)(reason)),
        ];
        return [2 /*return*/, (0, util_1.getLogMessageEmbed)(user, timestamp)
                .setDescription(content.join("\n"))
                .setColor("Red")];
    });
}); })
    .addMessageType("ultimatumEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var user = _d.user, createdAt = _d.createdAt, endedAt = _d.endedAt, reason = _d.reason;
    return __generator(this, function (_e) {
        content = [
            (0, discord_js_1.bold)("Kończy ultimatum"),
            "Poczatek: ".concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Koniec: ".concat((0, discord_js_1.time)(endedAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Pow\u00F3d: ".concat((0, discord_js_1.italic)(reason)),
        ];
        return [2 /*return*/, (0, util_1.getLogMessageEmbed)(user, timestamp)
                .setDescription(content.join("\n"))
                .setColor("Green")];
    });
}); })
    .addMessageType("massdmStart", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var lines;
    var timestamp = _c.timestamp;
    var user = _d.user, createdAt = _d.createdAt, role = _d.role, content = _d.content;
    return __generator(this, function (_e) {
        lines = [
            (0, discord_js_1.bold)("Rozpoczęto wysyłanie masowych DM"),
            "Poczatek: ".concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Rola: ".concat(role.name, " (").concat(role.id, ")"),
            "Tre\u015B\u0107: ".concat((0, discord_js_1.italic)(content)),
        ];
        return [2 /*return*/, (0, util_1.getLogMessageEmbed)(user, timestamp)
                .setDescription(lines.join("\n"))
                .setColor("Red")];
    });
}); })
    .addMessageType("massdmEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var lines;
    var timestamp = _c.timestamp;
    var user = _d.user, createdAt = _d.createdAt, endedAt = _d.endedAt, role = _d.role, sentMessages = _d.successfulMessages, failedMessages = _d.failedMessages;
    return __generator(this, function (_e) {
        lines = [
            (0, discord_js_1.bold)("Zakończono wysyłanie masowych DM"),
            "Poczatek: ".concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Koniec: ".concat((0, discord_js_1.time)(endedAt, discord_js_1.TimestampStyles.RelativeTime)),
            "Zaj\u0119\u0142o: ".concat((0, duration_1.formatDuration)((0, date_fns_1.intervalToDuration)({ start: createdAt, end: endedAt }))),
            "Rola: ".concat(role.name, " (").concat(role.id, ")"),
            "Wys\u0142ane wiadomo\u015Bci: ".concat(sentMessages),
            "Nieudane wiadomo\u015Bci: ".concat(failedMessages),
        ];
        return [2 /*return*/, (0, util_1.getLogMessageEmbed)(user, timestamp)
                .setDescription(lines.join("\n"))
                .setColor("Green")];
    });
}); }));
