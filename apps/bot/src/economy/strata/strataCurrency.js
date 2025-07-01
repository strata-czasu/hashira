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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strataCurrency = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var discord_js_1 = require("discord.js");
var base_1 = require("../../base");
var specializedConstants_1 = require("../../specializedConstants");
var ensureUsersExist_1 = require("../../util/ensureUsersExist");
var fetchMembers_1 = require("../../util/fetchMembers");
var parseUsers_1 = require("../../util/parseUsers");
var pluralize_1 = require("../../util/pluralize");
var economyError_1 = require("../economyError");
var transferManager_1 = require("../managers/transferManager");
var walletManager_1 = require("../managers/walletManager");
var util_1 = require("../util");
exports.strataCurrency = new core_1.Hashira({ name: "strata-currency" })
    .use(base_1.base)
    .group("punkty", function (group) {
    return group
        .setDefaultMemberPermissions(0)
        .setDescription("Komendy do punktów")
        .addCommand("sprawdz", function (command) {
        return command
            .setDescription("Sprawdź swoje punkty")
            .addUser("użytkownik", function (option) {
            return option
                .setDescription("Użytkownik, którego punkty chcesz sprawdzić")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var userId, wallet, self, balance;
            var _e;
            var prisma = _c.prisma;
            var user = _d.użytkownik;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        userId = (_e = user === null || user === void 0 ? void 0 : user.id) !== null && _e !== void 0 ? _e : itx.user.id;
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, userId)];
                    case 1:
                        _f.sent();
                        return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                                prisma: prisma,
                                userId: userId,
                                guildId: itx.guildId,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            })];
                    case 2:
                        wallet = _f.sent();
                        self = itx.user.id === userId;
                        balance = (0, util_1.formatBalance)(wallet.balance, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                        if (!self) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.reply("Masz na swoim koncie: ".concat(balance))];
                    case 3:
                        _f.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, itx.reply("U\u017Cytkownik ".concat(user, " ma na swoim koncie: ").concat(balance))];
                    case 5:
                        _f.sent();
                        _f.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("historia", function (command) {
        return command
            .setDescription("Sprawdź historię transakcji punktów")
            .addUser("użytkownik", function (option) {
            return option
                .setDescription("Użytkownik, którego punkty chcesz sprawdzić")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var targetUser, wallet, where, paginator, formatTransaction, view;
            var prisma = _c.prisma;
            var user = _d.użytkownik;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        targetUser = user !== null && user !== void 0 ? user : itx.user;
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, targetUser.id)];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                                prisma: prisma,
                                userId: targetUser.id,
                                guildId: itx.guildId,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            })];
                    case 2:
                        wallet = _e.sent();
                        where = { walletId: wallet.id };
                        paginator = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.transaction.findMany(__assign(__assign({}, props), { where: where, orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.transaction.count({ where: where }); }, { pageSize: 15, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatTransaction = function (transaction) {
                            var parts = [
                                (0, discord_js_1.time)(transaction.createdAt, discord_js_1.TimestampStyles.ShortDateTime),
                                (0, util_1.formatBalance)(transaction.amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol),
                            ];
                            if (transaction.reason) {
                                parts.push("- ".concat((0, discord_js_1.italic)(transaction.reason)));
                            }
                            return parts.join(" ");
                        };
                        view = new core_1.PaginatedView(paginator, "Transakcje ".concat(targetUser.tag), formatTransaction, true);
                        return [4 /*yield*/, view.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("dodaj", function (command) {
        return command
            .setDescription("[KADRA] Dodaj punkty użytkownikowi")
            .addInteger("ilość", function (option) {
            return option.setDescription("Ilość punktów do dodania");
        })
            .addString("użytkownicy", function (option) {
            return option.setDescription("Użytkownicy, którym chcesz dodać punkty");
        })
            .addString("powód", function (option) {
            return option.setDescription("Powód dodania punktów").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var members, error_1, amountFormatted;
            var prisma = _c.prisma, log = _c.economyLog;
            var amount = _d.ilość, rawMembers = _d.użytkownicy, reason = _d.powód;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!!itx.memberPermissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) return [3 /*break*/, 2];
                        return [4 /*yield*/, itx.reply("Nie masz uprawnień do dodawania punktów")];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(rawMembers))];
                    case 3:
                        members = _e.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, __spreadArray(__spreadArray([], members.keys(), true), [itx.user.id], false))];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 7, , 10]);
                        return [4 /*yield*/, (0, transferManager_1.addBalances)({
                                prisma: prisma,
                                fromUserId: itx.user.id,
                                guildId: itx.guildId,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                                toUserIds: __spreadArray([], members.keys(), true),
                                amount: amount,
                                reason: reason,
                            })];
                    case 6:
                        _e.sent();
                        return [3 /*break*/, 10];
                    case 7:
                        error_1 = _e.sent();
                        if (!(error_1 instanceof economyError_1.EconomyError)) return [3 /*break*/, 9];
                        return [4 /*yield*/, itx.reply(error_1.message)];
                    case 8:
                        _e.sent();
                        return [2 /*return*/];
                    case 9: throw error_1;
                    case 10:
                        log.push("currencyAdd", itx.guild, {
                            moderator: itx.user,
                            toUsers: members.map(function (m) { return m.user; }),
                            amount: amount,
                            reason: reason,
                        });
                        amountFormatted = (0, util_1.formatBalance)(amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                        return [4 /*yield*/, itx.reply("Dodano ".concat(amountFormatted, " ").concat(members.size, " ").concat(pluralize_1.pluralizers.users(members.size), "."))];
                    case 11:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("przekaz", function (command) {
        return command
            .setDescription("Przekaż punkty użytkownikowi")
            .addString("użytkownicy", function (option) {
            return option.setDescription("Użytkownicy, którym chcesz przekazać punkty");
        })
            .addInteger("ilość", function (option) {
            return option.setDescription("Ilość punktów do przekazania");
        })
            .addString("powód", function (option) {
            return option.setDescription("Powód przekazania punktów").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var members, error_2, amountFormatted, memberMentions;
            var prisma = _c.prisma, log = _c.economyLog;
            var rawMembers = _d.użytkownicy, amount = _d.ilość, reason = _d.powód;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(rawMembers))];
                    case 1:
                        members = _e.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, __spreadArray(__spreadArray([], members.keys(), true), [itx.user.id], false))];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3:
                        _e.trys.push([3, 5, , 8]);
                        return [4 /*yield*/, (0, transferManager_1.transferBalances)({
                                prisma: prisma,
                                fromUserId: itx.user.id,
                                guildId: itx.guildId,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                                toUserIds: __spreadArray([], members.keys(), true),
                                amount: amount,
                                reason: reason,
                            })];
                    case 4:
                        _e.sent();
                        return [3 /*break*/, 8];
                    case 5:
                        error_2 = _e.sent();
                        if (!(error_2 instanceof economyError_1.EconomyError)) return [3 /*break*/, 7];
                        return [4 /*yield*/, itx.reply(error_2.message)];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                    case 7: throw error_2;
                    case 8:
                        log.push("currencyTransfer", itx.guild, {
                            fromUser: itx.user,
                            toUsers: members.map(function (m) { return m.user; }),
                            amount: amount,
                            reason: reason,
                        });
                        amountFormatted = (0, util_1.formatBalance)(amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                        memberMentions = members
                            .map(function (member) { return member.toString(); })
                            .join(", ");
                        return [4 /*yield*/, itx.reply("Przekazano ".concat(amountFormatted, " ").concat(members.size, " ").concat(pluralize_1.pluralizers.users(members.size), ": ").concat(memberMentions, "."))];
                    case 9:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
