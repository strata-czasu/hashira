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
exports.strataDaily = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../../base");
var specializedConstants_1 = require("../../specializedConstants");
var ensureUsersExist_1 = require("../../util/ensureUsersExist");
var transferManager_1 = require("../managers/transferManager");
var util_1 = require("../util");
var calculateDailyAmount = function (marriageBonus, targetNotSelf) {
    if (!targetNotSelf) {
        return (0, es_toolkit_1.randomInt)(10, 100);
    }
    if (marriageBonus) {
        var amount = (0, es_toolkit_1.randomInt)(30, 150);
        return (0, es_toolkit_1.randomInt)(0, 100) < 5 ? -amount : amount;
    }
    return (0, es_toolkit_1.randomInt)(30, 100);
};
var calculateDailyStreak = function (prisma, userId, guildId) { return __awaiter(void 0, void 0, void 0, function () {
    var redeems, streak, lastTimestamp, _i, redeems_1, redeem;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.dailyPointsRedeems.findMany({
                    where: { userId: userId, guildId: guildId },
                    orderBy: { timestamp: "desc" },
                })];
            case 1:
                redeems = _a.sent();
                streak = 0;
                lastTimestamp = new Date();
                // Ensure that the user hasn't redeemed today
                if (redeems[0] && (0, date_fns_1.isSameDay)(redeems[0].timestamp, new Date())) {
                    return [2 /*return*/, -1];
                }
                for (_i = 0, redeems_1 = redeems; _i < redeems_1.length; _i++) {
                    redeem = redeems_1[_i];
                    if ((0, date_fns_1.isSameDay)(redeem.timestamp, (0, date_fns_1.subDays)(lastTimestamp, 1))) {
                        streak++;
                    }
                    else {
                        break;
                    }
                    lastTimestamp = redeem.timestamp;
                }
                return [2 /*return*/, streak];
        }
    });
}); };
exports.strataDaily = new core_1.Hashira({ name: "strata-daily" })
    .use(base_1.base)
    .command("daily", function (command) {
    return command
        .setDefaultMemberPermissions(0)
        .setDescription("Odbierz lub przekaż swoje codzienne punkty")
        .addUser("użytkownik", function (option) {
        return option
            .setDescription("Użytkownik, któremu chcesz przekazać punkty")
            .setRequired(false);
    })
        .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
        var targetUser, invokerMarriage, dailyStreak, shouldApplyMarriageBonus, shouldApplyTargetNotSelf, amount, streakBonus, totalAmount, balance, giveOrReceive, lines;
        var prisma = _c.prisma;
        var user = _d.użytkownik;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _e.sent();
                    targetUser = user !== null && user !== void 0 ? user : itx.user;
                    return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [itx.user.id, targetUser.id])];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { id: itx.user.id },
                            select: { marriedTo: true },
                        })];
                case 3:
                    invokerMarriage = _e.sent();
                    return [4 /*yield*/, calculateDailyStreak(prisma, itx.user.id, itx.guildId)];
                case 4:
                    dailyStreak = _e.sent();
                    if (!(dailyStreak === -1)) return [3 /*break*/, 6];
                    return [4 /*yield*/, itx.editReply("Twoje dzisiejsze punkty zostały już odebrane!")];
                case 5:
                    _e.sent();
                    return [2 /*return*/];
                case 6:
                    shouldApplyMarriageBonus = (invokerMarriage === null || invokerMarriage === void 0 ? void 0 : invokerMarriage.marriedTo) === targetUser.id;
                    shouldApplyTargetNotSelf = itx.user.id !== targetUser.id;
                    amount = calculateDailyAmount(shouldApplyMarriageBonus, shouldApplyTargetNotSelf);
                    streakBonus = Math.min(dailyStreak, 20) / 100;
                    totalAmount = Math.floor(amount * (1 + streakBonus));
                    return [4 /*yield*/, (0, transferManager_1.addBalance)({
                            prisma: prisma,
                            currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            reason: "Daily",
                            guildId: itx.guildId,
                            toUserId: targetUser.id,
                            amount: totalAmount,
                        })];
                case 7:
                    _e.sent();
                    return [4 /*yield*/, prisma.dailyPointsRedeems.create({
                            data: { userId: itx.user.id, guildId: itx.guildId },
                        })];
                case 8:
                    _e.sent();
                    balance = (0, util_1.formatBalance)(totalAmount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                    giveOrReceive = shouldApplyTargetNotSelf
                        ? "Przekazujesz ".concat(balance, " dla ").concat((0, discord_js_1.userMention)(targetUser.id), "!")
                        : "Otrzymujesz ".concat(balance, "!");
                    lines = [
                        (0, discord_js_1.bold)("Twoje codzienne punkty!"),
                        giveOrReceive,
                        "Tw\u00F3j obecny streak: ".concat(dailyStreak + 1),
                    ];
                    return [4 /*yield*/, itx.editReply(lines.join("\n"))];
                case 9:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
