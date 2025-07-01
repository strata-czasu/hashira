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
exports.economyLog = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var util_1 = require("../../economy/util");
var specializedConstants_1 = require("../../specializedConstants");
var pluralize_1 = require("../../util/pluralize");
var logger_1 = require("./logger");
var util_2 = require("./util");
exports.economyLog = new core_1.Hashira({ name: "economyLog" }).const("economyLog", new logger_1.Logger()
    .addMessageType("currencyTransfer", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var formattedAmount, lines, user, userMentions, totalAmount;
    var timestamp = _c.timestamp;
    var fromUser = _d.fromUser, toUsers = _d.toUsers, amount = _d.amount, reason = _d.reason;
    return __generator(this, function (_e) {
        formattedAmount = (0, util_1.formatBalance)(amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
        lines = [];
        if (toUsers.length === 1) {
            user = toUsers[0];
            if (!user)
                throw new Error("Invalid state: user is undefined");
            lines.push("Przekazuje ".concat(formattedAmount, " dla ").concat((0, discord_js_1.userMention)(user.id)));
        }
        else {
            userMentions = toUsers.map(function (user) { return user.toString(); }).join(", ");
            totalAmount = amount * toUsers.length;
            lines.push("Przekazuje ".concat(formattedAmount, " ").concat(toUsers.length, " ").concat(pluralize_1.pluralizers.users(toUsers.length), ": ").concat(userMentions), "**Razem**: ".concat((0, util_1.formatBalance)(totalAmount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol)));
        }
        if (reason !== null) {
            lines.push("**Pow\u00F3d**: ".concat((0, discord_js_1.italic)(reason)));
        }
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(fromUser, timestamp)
                .setColor("Yellow")
                .setDescription(lines.join("\n"))];
    });
}); })
    .addMessageType("currencyAdd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var embed, formattedAmount, lines, user, userMentions, totalAmount;
    var timestamp = _c.timestamp;
    var moderator = _d.moderator, toUsers = _d.toUsers, amount = _d.amount, reason = _d.reason;
    return __generator(this, function (_e) {
        embed = (0, util_2.getLogMessageEmbed)(moderator, timestamp).setColor("Green");
        formattedAmount = (0, util_1.formatBalance)(amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
        lines = [];
        if (toUsers.length === 1) {
            user = toUsers[0];
            if (!user)
                throw new Error("Invalid state: user is undefined");
            lines.push("Dodaje ".concat(formattedAmount, " dla ").concat((0, discord_js_1.userMention)(user.id)));
        }
        else {
            userMentions = toUsers.map(function (user) { return user.toString(); }).join(", ");
            totalAmount = amount * toUsers.length;
            lines.push("Dodaje ".concat(formattedAmount, " ").concat(toUsers.length, " ").concat(pluralize_1.pluralizers.users(toUsers.length), ": ").concat(userMentions), "**Razem**: ".concat((0, util_1.formatBalance)(totalAmount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol)));
        }
        if (amount >= 0) {
            embed.setColor("Green");
        }
        else {
            embed.setColor("Red");
        }
        if (reason !== null) {
            lines.push("**Pow\u00F3d**: ".concat((0, discord_js_1.italic)(reason)));
        }
        embed.setDescription(lines.join("\n"));
        return [2 /*return*/, embed];
    });
}); })
    .addMessageType("itemTransfer", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var timestamp = _c.timestamp;
    var fromUser = _d.fromUser, toUser = _d.toUser, item = _d.item;
    return __generator(this, function (_e) {
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(fromUser, timestamp)
                .setDescription("Przekazuje ".concat((0, discord_js_1.bold)(item.name), " [").concat((0, discord_js_1.inlineCode)(item.id.toString()), "] dla ").concat((0, discord_js_1.userMention)(toUser.id)))
                .setColor("Yellow")];
    });
}); })
    .addMessageType("itemAddToInventory", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var timestamp = _c.timestamp;
    var moderator = _d.moderator, user = _d.user, item = _d.item;
    return __generator(this, function (_e) {
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription("Dodaje ".concat((0, discord_js_1.bold)(item.name), " [").concat((0, discord_js_1.inlineCode)(item.id.toString()), "] do ekwipunku ").concat((0, discord_js_1.userMention)(user.id)))
                .setColor("Green")];
    });
}); })
    .addMessageType("itemRemoveFromInventory", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var timestamp = _c.timestamp;
    var moderator = _d.moderator, user = _d.user, item = _d.item;
    return __generator(this, function (_e) {
        return [2 /*return*/, (0, util_2.getLogMessageEmbed)(moderator, timestamp)
                .setDescription("Zabiera ".concat((0, discord_js_1.bold)(item.name), " [").concat((0, discord_js_1.inlineCode)(item.id.toString()), "] z ekwipunku ").concat((0, discord_js_1.userMention)(user.id)))
                .setColor("Red")];
    });
}); }));
