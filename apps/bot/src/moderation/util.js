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
exports.sendVerificationFailedMessage = exports.cancelVerificationReminders = exports.scheduleVerificationReminders = exports.formatBanReason = exports.removeMute = exports.applyMute = exports.formatMuteLength = exports.getMuteRoleId = exports.formatUserWithId = void 0;
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var specializedConstants_1 = require("../specializedConstants");
var discordTry_1 = require("../util/discordTry");
var duration_1 = require("../util/duration");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var formatUserWithId = function (user) {
    var tag = user instanceof discord_js_1.GuildMember ? user.user.tag : user.tag;
    return "".concat((0, discord_js_1.bold)(tag), " (").concat((0, discord_js_1.inlineCode)(user.id), ")");
};
exports.formatUserWithId = formatUserWithId;
var getMuteRoleId = function (prisma, guildId) { return __awaiter(void 0, void 0, void 0, function () {
    var settings;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.guildSettings.findFirst({ where: { guildId: guildId } })];
            case 1:
                settings = _a.sent();
                if (!settings)
                    return [2 /*return*/, null];
                return [2 /*return*/, settings.muteRoleId];
        }
    });
}); };
exports.getMuteRoleId = getMuteRoleId;
var formatMuteLength = function (mute) {
    var createdAt = mute.createdAt, endsAt = mute.endsAt;
    var duration = (0, date_fns_1.intervalToDuration)({ start: createdAt, end: endsAt });
    var durationParts = [];
    if (duration.days)
        durationParts.push("".concat(duration.days, "d"));
    if (duration.hours)
        durationParts.push("".concat(duration.hours, "h"));
    if (duration.minutes)
        durationParts.push("".concat(duration.minutes, "m"));
    if (duration.seconds)
        durationParts.push("".concat(duration.seconds, "s"));
    if (durationParts.length === 0)
        return "0s";
    return durationParts.join(" ");
};
exports.formatMuteLength = formatMuteLength;
/**
 * Apply a mute to a member.
 *
 * @returns true if the mute was successful, false if the mute failed
 */
var applyMute = function (member, muteRoleId, auditLogMessage) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!member.voice.channel) return [3 /*break*/, 2];
                            return [4 /*yield*/, member.voice.disconnect(auditLogMessage)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [4 /*yield*/, member.roles.add(muteRoleId, auditLogMessage)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, true];
                    }
                });
            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return false; })];
    });
}); };
exports.applyMute = applyMute;
var removeMute = function (member, muteRoleId, auditLogMessage) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, member.roles.remove(muteRoleId, auditLogMessage)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, true];
                    }
                });
            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return false; })];
    });
}); };
exports.removeMute = removeMute;
var formatBanReason = function (reason, moderator, createdAt) {
    var _a;
    var components = [reason];
    if (moderator) {
        var tag = (_a = moderator.tag) !== null && _a !== void 0 ? _a : "Nieznany";
        components.push(" (banuj\u0105cy: ".concat(tag, " (").concat(moderator.id, ")"));
    }
    components.push(", data: ".concat((0, date_fns_1.formatDate)(createdAt, "yyyy-MM-dd HH:mm:ss")));
    return components.join("");
};
exports.formatBanReason = formatBanReason;
var scheduleVerificationReminders = function (messageQueue, verificationId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, messageQueue.push("verificationReminder", {
                    verificationId: verificationId,
                    elapsed: { hours: 24 },
                    remaining: { hours: 48 },
                }, (0, duration_1.durationToSeconds)({ hours: 24 }), "".concat(verificationId, "-reminder-24h"))];
            case 1:
                _a.sent();
                return [4 /*yield*/, messageQueue.push("verificationReminder", {
                        verificationId: verificationId,
                        elapsed: { hours: 48 },
                        remaining: { hours: 24 },
                    }, (0, duration_1.durationToSeconds)({ hours: 48 }), "".concat(verificationId, "-reminder-48h"))];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.scheduleVerificationReminders = scheduleVerificationReminders;
var cancelVerificationReminders = function (tx, messageQueue, verificationId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.all([
                    messageQueue.cancelTx(tx, "verificationReminder", "".concat(verificationId, "-reminder-24h")),
                    messageQueue.cancelTx(tx, "verificationReminder", "".concat(verificationId, "-reminder-48h")),
                ])];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.cancelVerificationReminders = cancelVerificationReminders;
var sendVerificationFailedMessage = function (user) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, sendDirectMessage_1.sendDirectMessage)(user, "Hej ".concat((0, discord_js_1.userMention)(user.id), "! Niestety nie zweryfikowa\u0142x\u015B swojego wieku w wyznaczonym terminie lub Twoja weryfikacja wieku zosta\u0142a odrzucona i dlatego **musia\u0142em zbanowa\u0107 Ci\u0119 na Stracie Czasu**.\n\nNadal mo\u017Cesz do nas wr\u00F3ci\u0107 po uko\u0144czeniu 16 lat. Wystarczy, \u017Ce **zg\u0142osisz si\u0119 do nas poprzez ten formularz zaraz po 16 urodzinach: ").concat((0, discord_js_1.hideLinkEmbed)(specializedConstants_1.STRATA_CZASU.BAN_APPEAL_URL), "**. Mam nadziej\u0119, \u017Ce jeszcze kiedy\u015B si\u0119 zobaczymy, pozdrawiam!"))];
    });
}); };
exports.sendVerificationFailedMessage = sendVerificationFailedMessage;
