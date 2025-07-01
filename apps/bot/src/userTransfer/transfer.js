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
exports.runOperations = exports.TRANSFER_OPERATIONS = exports.transferRoles = void 0;
var discord_js_1 = require("discord.js");
var transferManager_1 = require("../economy/managers/transferManager");
var walletManager_1 = require("../economy/managers/walletManager");
var util_1 = require("../economy/util");
var verification_1 = require("../moderation/verification");
var specializedConstants_1 = require("../specializedConstants");
var discordTry_1 = require("../util/discordTry");
var transferRoles = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var oldMember, newMember, roles;
    var oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild, moderator = _b.moderator;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, guild.members.fetch(oldUser.id)];
                }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return null; })];
            case 1:
                oldMember = _c.sent();
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, guild.members.fetch(newUser.id)];
                    }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return null; })];
            case 2:
                newMember = _c.sent();
                if (!oldMember || !newMember)
                    return [2 /*return*/, null];
                roles = oldMember.roles.cache
                    .filter(function (r) { return r !== oldMember.guild.roles.everyone; })
                    .map(function (r) { return r; });
                if (roles.length === 0)
                    return [2 /*return*/, null];
                return [4 /*yield*/, newMember.roles.add(roles, "Przeniesienie roli z u\u017Cytkownika ".concat(oldMember.user.tag, " (").concat(oldMember.id, "), moderator: ").concat(moderator.tag, " (").concat(moderator.id, ")"))];
            case 3:
                _c.sent();
                return [2 /*return*/, "Skopiowano ".concat(roles.length, " r\u00F3l.")];
        }
    });
}); };
exports.transferRoles = transferRoles;
var transferVerification = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var prisma = _b.prisma, oldDbUser = _b.oldDbUser, newDbUser = _b.newDbUser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!oldDbUser.verificationLevel)
                    return [2 /*return*/, null];
                return [4 /*yield*/, prisma.user.update({
                        where: { id: newDbUser.id },
                        data: { verificationLevel: oldDbUser === null || oldDbUser === void 0 ? void 0 : oldDbUser.verificationLevel },
                    })];
            case 1:
                _c.sent();
                return [2 /*return*/, "Skopiowano poziom weryfikacji (".concat((0, verification_1.formatVerificationType)(oldDbUser.verificationLevel), ")...")];
        }
    });
}); };
var transferTextActivity = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.userTextActivity.updateMany({
                    where: { userId: oldUser.id, guildId: guild.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono aktywno\u015B\u0107 tekstow\u0105 (".concat(count, ")...")];
        }
    });
}); };
var transferInventory = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.inventoryItem.updateMany({
                    where: { userId: oldUser.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono ".concat(count, " przedmioty")];
        }
    });
}); };
var transferWallets = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var oldWallet;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                    prisma: prisma,
                    userId: oldUser.id,
                    guildId: guild.id,
                    currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                })];
            case 1:
                oldWallet = _c.sent();
                if (!oldWallet.balance)
                    return [2 /*return*/, null];
                return [4 /*yield*/, (0, transferManager_1.transferBalances)({
                        prisma: prisma,
                        fromUserId: oldUser.id,
                        toUserIds: [newUser.id],
                        guildId: guild.id,
                        currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                        amount: oldWallet.balance,
                        reason: "Przeniesienie z konta ".concat(oldUser.id, " na ").concat(newUser.id),
                    })];
            case 2:
                _c.sent();
                // TODO: Wallet transfer for custom currencies
                return [2 /*return*/, "Przeniesiono ".concat((0, util_1.formatBalance)(oldWallet.balance, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol))];
        }
    });
}); };
var transferUltimatum = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.ultimatum.updateMany({
                    where: { userId: oldUser.id, guildId: guild.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono ".concat(count, " ultimatum")];
        }
    });
}); };
var transferMutes = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.mute.updateMany({
                    where: { userId: oldUser.id, guildId: guild.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono ".concat(count, " wycisze\u0144")];
        }
    });
}); };
var transferWarns = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.warn.updateMany({
                    where: { userId: oldUser.id, guildId: guild.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono ".concat(count, " ostrze\u017Ce\u0144")];
        }
    });
}); };
var transferDmPollParticipations = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.dmPollParticipant.updateMany({
                    where: { userId: oldUser.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono uczestnictwo w ".concat(count, " ankietach")];
        }
    });
}); };
var transferDmPollVotes = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.dmPollVote.updateMany({
                    where: { userId: oldUser.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono g\u0142osy w ".concat(count, " ankietach")];
        }
    });
}); };
var transferDmPollExclusion = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var count;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.dmPollExclusion.updateMany({
                    where: { userId: oldUser.id },
                    data: { userId: newUser.id },
                })];
            case 1:
                count = (_c.sent()).count;
                if (!count)
                    return [2 /*return*/, null];
                return [2 /*return*/, "Przeniesiono wykluczenie z ankiet"];
        }
    });
}); };
var transferMarriage = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var prisma = _b.prisma, oldDbUser = _b.oldDbUser;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!oldDbUser.marriedTo)
                    return [2 /*return*/, null];
                return [4 /*yield*/, prisma.user.updateMany({
                        where: { id: { in: [oldDbUser.id, oldDbUser.marriedTo] } },
                        data: { marriedTo: null, marriedAt: null },
                    })];
            case 1:
                _c.sent();
                return [2 /*return*/, "Stary user ma aktywne ma\u0142\u017Ce\u0144stwo. Rozwiedziono ".concat((0, discord_js_1.userMention)(oldDbUser.id), " (").concat(oldDbUser.id, ") z ").concat((0, discord_js_1.userMention)(oldDbUser.marriedTo), " (").concat(oldDbUser.marriedTo, ")")];
        }
    });
}); };
var transferChannelRestrictions = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var restrictions, transferredCount, permissionErrors, _loop_1, _i, restrictions_1, restriction, message;
    var prisma = _b.prisma, oldUser = _b.oldUser, newUser = _b.newUser, guild = _b.guild;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.channelRestriction.findMany({
                    where: { userId: oldUser.id, guildId: guild.id, deletedAt: null },
                })];
            case 1:
                restrictions = _c.sent();
                if (restrictions.length === 0)
                    return [2 /*return*/, null];
                transferredCount = 0;
                permissionErrors = 0;
                _loop_1 = function (restriction) {
                    var channel_1, result, error_1;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0:
                                _d.trys.push([0, 10, , 11]);
                                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return guild.channels.fetch(restriction.channelId); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel], function () { return null; })];
                            case 1:
                                channel_1 = _d.sent();
                                if (!(channel_1 && channel_1.isTextBased())) return [3 /*break*/, 7];
                                // Remove permission override from old user
                                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return channel_1.permissionOverwrites.delete(oldUser, "Przeniesienie ograniczenia kanału"); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions, discord_js_1.RESTJSONErrorCodes.UnknownOverwrite], function () { return null; })];
                            case 2:
                                // Remove permission override from old user
                                _d.sent();
                                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                                        return channel_1.permissionOverwrites.edit(newUser, { ViewChannel: false }, { reason: "Przeniesienie ograniczenia kanału" });
                                    }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return null; })];
                            case 3:
                                result = _d.sent();
                                if (!result) return [3 /*break*/, 5];
                                // Update database record to point to new user
                                return [4 /*yield*/, prisma.channelRestriction.update({
                                        where: { id: restriction.id },
                                        data: { userId: newUser.id },
                                    })];
                            case 4:
                                // Update database record to point to new user
                                _d.sent();
                                transferredCount++;
                                return [3 /*break*/, 6];
                            case 5:
                                permissionErrors++;
                                _d.label = 6;
                            case 6: return [3 /*break*/, 9];
                            case 7: 
                            // Channel doesn't exist or isn't text-based, just update database
                            return [4 /*yield*/, prisma.channelRestriction.update({
                                    where: { id: restriction.id },
                                    data: { userId: newUser.id },
                                })];
                            case 8:
                                // Channel doesn't exist or isn't text-based, just update database
                                _d.sent();
                                transferredCount++;
                                _d.label = 9;
                            case 9: return [3 /*break*/, 11];
                            case 10:
                                error_1 = _d.sent();
                                console.error("Error transferring channel restriction ".concat(restriction.id, ":"), error_1);
                                permissionErrors++;
                                return [3 /*break*/, 11];
                            case 11: return [2 /*return*/];
                        }
                    });
                };
                _i = 0, restrictions_1 = restrictions;
                _c.label = 2;
            case 2:
                if (!(_i < restrictions_1.length)) return [3 /*break*/, 5];
                restriction = restrictions_1[_i];
                return [5 /*yield**/, _loop_1(restriction)];
            case 3:
                _c.sent();
                _c.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5:
                message = "Przeniesiono ".concat(transferredCount, " ogranicze\u0144 dost\u0119pu do kana\u0142\u00F3w");
                if (permissionErrors > 0) {
                    message += " (".concat(permissionErrors, " b\u0142\u0119d\u00F3w uprawnie\u0144)");
                }
                return [2 /*return*/, transferredCount > 0 ? message : null];
        }
    });
}); };
exports.TRANSFER_OPERATIONS = [
    { name: "role", fn: exports.transferRoles },
    { name: "weryfikacja", fn: transferVerification },
    { name: "aktywność tekstowa", fn: transferTextActivity },
    { name: "ekwipunek", fn: transferInventory },
    { name: "portfele", fn: transferWallets },
    { name: "ultimatum", fn: transferUltimatum },
    { name: "wyciszenia", fn: transferMutes },
    { name: "ostrzeżenia", fn: transferWarns },
    { name: "ograniczenia kanałów", fn: transferChannelRestrictions },
    { name: "uczestnictwa w ankietach", fn: transferDmPollParticipations },
    { name: "głosy w ankietach", fn: transferDmPollVotes },
    { name: "wykluczenie z ankiet", fn: transferDmPollExclusion },
    { name: "ślub", fn: transferMarriage },
];
var runOperations = function (options) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, Promise.all(exports.TRANSFER_OPERATIONS.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                var message, e_1;
                var name = _b.name, fn = _b.fn;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, fn(options)];
                        case 1:
                            message = _c.sent();
                            if (message === null)
                                return [2 /*return*/, { type: "noop", name: name }];
                            return [2 /*return*/, { type: "ok", name: name, message: message }];
                        case 2:
                            e_1 = _c.sent();
                            console.error("Error running transfer operation ".concat(name, ":"), e_1);
                            return [2 /*return*/, { type: "err", name: name }];
                        case 3: return [2 /*return*/];
                    }
                });
            }); }))];
    });
}); };
exports.runOperations = runOperations;
