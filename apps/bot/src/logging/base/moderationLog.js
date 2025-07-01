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
exports.moderationLog = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var util_1 = require("../../moderation/util");
var logger_1 = require("./logger");
var util_2 = require("./util");
var getWarnLogHeader = function (action, warn) {
    return "**".concat(action, " ostrze\u017Cenie [").concat((0, discord_js_1.inlineCode)(warn.id.toString()), "] dla ").concat((0, discord_js_1.userMention)(warn.userId), " (").concat(warn.userId, ")**");
};
var getMuteLogHeader = function (action, mute) {
    return "**".concat(action, " wyciszenie [").concat((0, discord_js_1.inlineCode)(mute.id.toString()), "] dla ").concat((0, discord_js_1.userMention)(mute.userId), " (").concat(mute.userId, ")**");
};
var getBanLogContent = function (title, reason, moderator) {
    var content = [(0, discord_js_1.bold)(title)];
    if (reason)
        content.push("Pow\u00F3d: ".concat((0, discord_js_1.italic)(reason)));
    var moderatorMentionString = moderator ? (0, discord_js_1.userMention)(moderator.id) : "Nieznany";
    content.push("Moderator: ".concat(moderatorMentionString));
    return content.join("\n");
};
exports.moderationLog = new core_1.Hashira({ name: "moderationLog" }).const("moderationLog", new logger_1.Logger()
    .addMessageType("warnCreate", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var timestamp = _c.timestamp;
    var warn = _d.warn, moderator = _d.moderator;
    return __generator(this, function (_e) {
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription("".concat(getWarnLogHeader("Nadaje", warn), "\nPow\u00F3d: ").concat((0, discord_js_1.italic)(warn.reason)))
                .setColor("Green")];
    });
}); })
    .addMessageType("warnRemove", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var warn = _d.warn, moderator = _d.moderator, removeReason = _d.removeReason;
    return __generator(this, function (_e) {
        content = "".concat(getWarnLogHeader("Usuwa", warn), "\nPow\u00F3d warna: ").concat((0, discord_js_1.italic)(warn.reason));
        if (removeReason)
            content += "\nPow\u00F3d usuni\u0119cia: ".concat((0, discord_js_1.italic)(removeReason));
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription(content)
                .setColor("Red")];
    });
}); })
    .addMessageType("warnEdit", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var timestamp = _c.timestamp;
    var warn = _d.warn, moderator = _d.moderator, oldReason = _d.oldReason, newReason = _d.newReason;
    return __generator(this, function (_e) {
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription("".concat(getWarnLogHeader("Edytuje", warn), "\nStary pow\u00F3d: ").concat((0, discord_js_1.italic)(oldReason), "\nNowy pow\u00F3d: ").concat((0, discord_js_1.italic)(newReason)))
                .setColor("Yellow")];
    });
}); })
    .addMessageType("muteCreate", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var timestamp = _c.timestamp;
    var mute = _d.mute, moderator = _d.moderator;
    return __generator(this, function (_e) {
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription("".concat(getMuteLogHeader("Nadaje", mute), "\nCzas trwania: ").concat((0, util_1.formatMuteLength)(mute), "\nKoniec: ").concat((0, discord_js_1.time)(mute.endsAt, discord_js_1.TimestampStyles.RelativeTime), "\nPow\u00F3d: ").concat((0, discord_js_1.italic)(mute.reason)))
                .setColor("Green")];
    });
}); })
    .addMessageType("muteRemove", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var mute = _d.mute, moderator = _d.moderator, removeReason = _d.removeReason;
    return __generator(this, function (_e) {
        content = "".concat(getMuteLogHeader("Usuwa", mute), "\nPow\u00F3d mute: ").concat((0, discord_js_1.italic)(mute.reason));
        if (removeReason)
            content += "\nPow\u00F3d usuni\u0119cia: ".concat((0, discord_js_1.italic)(removeReason));
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription(content)
                .setColor("Yellow")];
    });
}); })
    .addMessageType("muteEdit", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var mute = _d.mute, moderator = _d.moderator, oldReason = _d.oldReason, newReason = _d.newReason, oldDuration = _d.oldDuration, newDuration = _d.newDuration;
    return __generator(this, function (_e) {
        content = getMuteLogHeader("Edytuje", mute);
        if (newReason)
            content += "\nStary pow\u00F3d: ".concat((0, discord_js_1.italic)(oldReason), "\nNowy pow\u00F3d: ").concat((0, discord_js_1.italic)(newReason));
        if (newDuration)
            content += "\nStary czas trwania: ".concat((0, date_fns_1.formatDuration)(oldDuration), "\nNowy czas trwania: ").concat((0, date_fns_1.formatDuration)(newDuration));
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription(content)
                .setColor("Yellow")];
    });
}); })
    .addMessageType("channelRestrictionCreate", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var restriction = _d.restriction, moderator = _d.moderator;
    return __generator(this, function (_e) {
        content = "**Odbiera dost\u0119p** ".concat((0, discord_js_1.channelMention)(restriction.channelId), " dla ").concat((0, discord_js_1.userMention)(restriction.userId));
        if (restriction.endsAt)
            content += "\nKoniec: ".concat((0, discord_js_1.time)(restriction.endsAt, discord_js_1.TimestampStyles.RelativeTime));
        content += "\nPow\u00F3d: ".concat((0, discord_js_1.italic)(restriction.reason));
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription(content)
                .setColor("Orange")];
    });
}); })
    .addMessageType("channelRestrictionRemove", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content;
    var timestamp = _c.timestamp;
    var restriction = _d.restriction, moderator = _d.moderator, removeReason = _d.removeReason;
    return __generator(this, function (_e) {
        content = "**Przywraca dost\u0119p** ".concat((0, discord_js_1.channelMention)(restriction.channelId), " dla ").concat((0, discord_js_1.userMention)(restriction.userId));
        if (removeReason)
            content += "\nPow\u00F3d przywr\u00F3cenia: ".concat((0, discord_js_1.italic)(removeReason));
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription(content)
                .setColor("Green")];
    });
}); })
    .addMessageType("guildBanAdd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content, embed;
    var timestamp = _c.timestamp;
    var reason = _d.reason, user = _d.user, moderator = _d.moderator;
    return __generator(this, function (_e) {
        content = getBanLogContent("Otrzymuje bana", reason, moderator);
        embed = (0, util_2.getLogMessageEmbed)(user, timestamp)
            .setDescription(content)
            .setColor("Red");
        return [2 /*return*/, embed];
    });
}); })
    .addMessageType("guildBanRemove", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var content, embed;
    var timestamp = _c.timestamp;
    var reason = _d.reason, user = _d.user, moderator = _d.moderator;
    return __generator(this, function (_e) {
        content = getBanLogContent("Otrzymuje unbana", reason, moderator);
        embed = (0, util_2.getLogMessageEmbed)(user, timestamp)
            .setDescription(content)
            .setColor("Green");
        return [2 /*return*/, embed];
    });
}); }));
