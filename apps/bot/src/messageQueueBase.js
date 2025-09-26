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
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageQueueBase = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var tasks_1 = require("@hashira/db/tasks");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var db_2 = require("./db");
var util_1 = require("./giveaway/util");
var base_1 = require("./logging/base");
var accessUtil_1 = require("./moderation/accessUtil");
var util_2 = require("./moderation/util");
var specializedConstants_1 = require("./specializedConstants");
var discordTry_1 = require("./util/discordTry");
var fetchGuildMember_1 = require("./util/fetchGuildMember");
var sendDirectMessage_1 = require("./util/sendDirectMessage");
exports.messageQueueBase = new core_1.Hashira({ name: "messageQueueBase" })
    .use(db_2.database)
    .use(base_1.loggingBase)
    .const(function (ctx) {
    var prisma = ctx.prisma;
    return __assign(__assign({}, ctx), { messageQueue: new tasks_1.MessageQueue(ctx.prisma)
            .addArg()
            .addHandler("ultimatumEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var currentUltimatum, updatedUltimatum, member;
            var client = _c.client;
            var userId = _d.userId, guildId = _d.guildId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.ultimatum.findFirst({
                            where: { userId: userId, guildId: guildId, endedAt: null },
                        })];
                    case 1:
                        currentUltimatum = _e.sent();
                        if (!currentUltimatum)
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.ultimatum.update({
                                where: { id: currentUltimatum.id },
                                data: { endedAt: new Date() },
                            })];
                    case 2:
                        updatedUltimatum = _e.sent();
                        return [4 /*yield*/, (0, fetchGuildMember_1.fetchGuildMember)(client, guildId, userId)];
                    case 3:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/];
                        return [4 /*yield*/, member.roles.remove(specializedConstants_1.STRATA_CZASU.ULTIMATUM_ROLE, "Koniec ultimatum")];
                    case 4:
                        _e.sent();
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, "Hej, to znowu ja! Twoje ultimatum dobiegło końca!")];
                    case 5:
                        _e.sent();
                        ctx.strataCzasuLog.push("ultimatumEnd", member.guild, {
                            user: member.user,
                            createdAt: updatedUltimatum.createdAt,
                            // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here because the ultimatum has just ended
                            endedAt: updatedUltimatum.endedAt,
                            reason: updatedUltimatum.reason,
                        });
                        return [2 /*return*/];
                }
            });
        }); })
            .addHandler("muteEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var verificationInProgress, settings, muteRoleId, member;
            var client = _c.client;
            var muteId = _d.muteId, guildId = _d.guildId, userId = _d.userId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.verification.findFirst({
                            where: { userId: userId, guildId: guildId, status: db_1.VerificationStatus.in_progress },
                        })];
                    case 1:
                        verificationInProgress = _e.sent();
                        if (verificationInProgress)
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.findFirst({
                                where: { guildId: guildId },
                            })];
                    case 2:
                        settings = _e.sent();
                        if (!settings || !settings.muteRoleId)
                            return [2 /*return*/];
                        muteRoleId = settings.muteRoleId;
                        return [4 /*yield*/, (0, fetchGuildMember_1.fetchGuildMember)(client, guildId, userId)];
                    case 3:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, member.roles.remove(muteRoleId, "Koniec wyciszenia [".concat(muteId, "]"))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.warn("Missing permissions to remove mute role ".concat(settings.muteRoleId, " from member ").concat(userId, " on guild ").concat(guildId));
                                    return [2 /*return*/];
                                });
                            }); })];
                    case 4:
                        _e.sent();
                        // NOTE: We could mention the user on the server if sending the DM fails
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, "To znowu ja ".concat((0, discord_js_1.userMention)(member.id), ". Dosta\u0142em informacj\u0119, \u017Ce Twoje wyciszenie dobieg\u0142o ko\u0144ca. Do zobaczenia na czatach!"))];
                    case 5:
                        // NOTE: We could mention the user on the server if sending the DM fails
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); })
            .addHandler("verificationEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var verification, moderator, rejectedAt, user, guild, sentMessage, banned, directMessageContent;
            var client = _c.client;
            var verificationId = _d.verificationId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.verification.findFirst({
                            where: { id: verificationId },
                        })];
                    case 1:
                        verification = _e.sent();
                        if (!verification)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, client.users.fetch(verification.moderatorId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 2:
                        moderator = _e.sent();
                        if (!moderator)
                            return [2 /*return*/];
                        rejectedAt = new Date();
                        return [4 /*yield*/, prisma.verification.update({
                                where: { id: verificationId },
                                data: { status: db_1.VerificationStatus.rejected, rejectedAt: rejectedAt },
                            })];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, client.users.fetch(verification.userId)];
                    case 4:
                        user = _e.sent();
                        return [4 /*yield*/, client.guilds.fetch(verification.guildId)];
                    case 5:
                        guild = _e.sent();
                        return [4 /*yield*/, (0, util_2.sendVerificationFailedMessage)(user)];
                    case 6:
                        sentMessage = _e.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                var reason;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            reason = (0, util_2.formatBanReason)("Nieudana weryfikacja 16+ [".concat(verificationId, "]"), moderator, rejectedAt);
                                            return [4 /*yield*/, guild.bans.create(user, { reason: reason })];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, true];
                                    }
                                });
                            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return false; })];
                    case 7:
                        banned = _e.sent();
                        directMessageContent = "Weryfikacja 16+ ".concat((0, util_2.formatUserWithId)(user), " [").concat((0, discord_js_1.inlineCode)(verificationId.toString()), "] dobieg\u0142a ko\u0144ca.");
                        if (banned) {
                            directMessageContent += " Użytkownik został zbanowany.";
                        }
                        else {
                            directMessageContent +=
                                " Nie udało się zbanować użytkownika. Sprawdź permisje i zbanuj go ręcznie.";
                            console.warn("Missing permissions to ban user ".concat(user.id, " (failed 16+ verification)."));
                        }
                        if (!sentMessage) {
                            directMessageContent +=
                                " Nie udało się powiadomić użytkownika o nieudanej weryfikacji.";
                        }
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(moderator, directMessageContent)];
                    case 8:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); })
            .addHandler("verificationReminder", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var verification, user, moderator;
            var client = _c.client;
            var verificationId = _d.verificationId, elapsed = _d.elapsed, remaining = _d.remaining;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.verification.findFirst({
                            where: { id: verificationId, status: db_1.VerificationStatus.in_progress },
                        })];
                    case 1:
                        verification = _e.sent();
                        if (!verification)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, client.users.fetch(verification.userId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 2:
                        user = _e.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, client.users.fetch(verification.moderatorId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 3:
                        moderator = _e.sent();
                        if (!moderator || !user)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(moderator, "Weryfikacja 16+ ".concat((0, util_2.formatUserWithId)(user), " [").concat((0, discord_js_1.inlineCode)(verificationId.toString()), "] trwa ju\u017C ").concat((0, date_fns_1.formatDuration)(elapsed), ". Pozosta\u0142o ").concat((0, date_fns_1.formatDuration)(remaining), ". Nie zapomnij o niej!"))];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); })
            .addHandler("reminder", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var member;
            var client = _c.client;
            var userId = _d.userId, guildId = _d.guildId, text = _d.text;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, (0, fetchGuildMember_1.fetchGuildMember)(client, guildId, userId)];
                    case 1:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, text)];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); })
            .addHandler("channelRestrictionEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var restriction, guild, channel, user;
            var client = _c.client;
            var restrictionId = _d.restrictionId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.channelRestriction.findFirst({
                            where: { id: restrictionId, deletedAt: null },
                        })];
                    case 1:
                        restriction = _e.sent();
                        if (!restriction)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, client.guilds.fetch(restriction.guildId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownGuild], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 2:
                        guild = _e.sent();
                        if (!guild)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, guild.channels.fetch(restriction.channelId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 3:
                        channel = _e.sent();
                        if (!channel)
                            return [2 /*return*/];
                        if (channel.isThread() || !channel.isTextBased()) {
                            console.warn("Channel restriction end for non-text channel or thread: ".concat(restrictionId));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, client.users.fetch(restriction.userId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownUser], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 4:
                        user = _e.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                                return channel.permissionOverwrites.delete(restriction.userId, "Koniec blokady dost\u0119pu [".concat(restrictionId, "]"));
                            }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, prisma.channelRestriction.update({
                                where: { id: restrictionId },
                                data: { deletedAt: new Date() },
                            })];
                    case 6:
                        _e.sent();
                        if (!user) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, (0, accessUtil_1.composeChannelRestrictionRestoreMessage)(user, restriction.channelId, null))];
                    case 7:
                        _e.sent();
                        _e.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        }); })
            .addHandler("giveawayEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var giveaway, guild, channel, message;
            var client = _c.client;
            var giveawayId = _d.giveawayId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.giveaway.findFirst({
                            where: { id: giveawayId },
                        })];
                    case 1:
                        giveaway = _e.sent();
                        if (!giveaway)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, client.guilds.fetch(giveaway.guildId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownGuild], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 2:
                        guild = _e.sent();
                        if (!guild)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, guild.channels.fetch(giveaway.channelId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 3:
                        channel = _e.sent();
                        if (!(channel === null || channel === void 0 ? void 0 : channel.isTextBased()))
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, channel.messages.fetch(giveaway.messageId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); })];
                    case 4:
                        message = _e.sent();
                        if (!message)
                            return [2 /*return*/];
                        (0, util_1.endGiveaway)(message, prisma);
                        return [2 /*return*/];
                }
            });
        }); })
            .addHandler("moderatorLeaveStart", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var leave, settings, member, moderatorLeaveRoleId, moderatorLeaveManagerId, leaveManager;
            var client = _c.client;
            var leaveId = _d.leaveId, userId = _d.userId, guildId = _d.guildId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.moderatorLeave.findFirst({
                            where: { id: leaveId, deletedAt: null },
                        })];
                    case 1:
                        leave = _e.sent();
                        if (!leave)
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.findFirst({
                                where: { guildId: guildId },
                            })];
                    case 2:
                        settings = _e.sent();
                        return [4 /*yield*/, (0, fetchGuildMember_1.fetchGuildMember)(client, guildId, userId)];
                    case 3:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/];
                        moderatorLeaveRoleId = settings === null || settings === void 0 ? void 0 : settings.moderatorLeaveRoleId;
                        if (!(leave.addRole && moderatorLeaveRoleId)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, member.roles.add(moderatorLeaveRoleId, "Rozpocz\u0119cie urlopu [".concat(leaveId, "]"))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, true];
                                    }
                                });
                            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.warn("Missing permissions to add moderator leave role ".concat(moderatorLeaveRoleId, " to member ").concat(userId, " in guild ").concat(guildId));
                                    return [2 /*return*/, false];
                                });
                            }); })];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5: return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, "Hej, w\u0142a\u015Bnie zacz\u0105\u0142 si\u0119 Tw\u00F3j urlop! Sko\u0144czy si\u0119 ".concat((0, discord_js_1.time)(leave.endsAt, discord_js_1.TimestampStyles.RelativeTime), " (").concat((0, discord_js_1.time)(leave.endsAt, discord_js_1.TimestampStyles.ShortDateTime), ")."))];
                    case 6:
                        _e.sent();
                        moderatorLeaveManagerId = settings === null || settings === void 0 ? void 0 : settings.moderatorLeaveManagerId;
                        if (!moderatorLeaveManagerId) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, fetchGuildMember_1.fetchGuildMember)(client, guildId, moderatorLeaveManagerId)];
                    case 7:
                        leaveManager = _e.sent();
                        if (!leaveManager) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(leaveManager, "".concat((0, discord_js_1.userMention)(member.id), " (").concat(member.user.tag, ") w\u0142a\u015Bnie rozpocz\u0105\u0142 urlop do ").concat((0, discord_js_1.time)(leave.endsAt, discord_js_1.TimestampStyles.ShortDateTime), " (").concat((0, discord_js_1.time)(leave.endsAt, discord_js_1.TimestampStyles.RelativeTime), ")."))];
                    case 8:
                        _e.sent();
                        _e.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        }); })
            .addHandler("moderatorLeaveEnd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
            var leave, settings, member, moderatorLeaveRoleId;
            var client = _c.client;
            var leaveId = _d.leaveId, userId = _d.userId, guildId = _d.guildId;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.moderatorLeave.findFirst({
                            where: { id: leaveId },
                        })];
                    case 1:
                        leave = _e.sent();
                        if (!leave)
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.findFirst({
                                where: { guildId: guildId },
                            })];
                    case 2:
                        settings = _e.sent();
                        return [4 /*yield*/, (0, fetchGuildMember_1.fetchGuildMember)(client, guildId, userId)];
                    case 3:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/];
                        moderatorLeaveRoleId = settings === null || settings === void 0 ? void 0 : settings.moderatorLeaveRoleId;
                        if (!(leave.addRole && moderatorLeaveRoleId)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, member.roles.remove(moderatorLeaveRoleId, "Koniec urlopu [".concat(leaveId, "]"))];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, true];
                                    }
                                });
                            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    console.warn("Missing permissions to remove moderator leave role ".concat(moderatorLeaveRoleId, " from member ").concat(userId, " in guild ").concat(guildId));
                                    return [2 /*return*/, false];
                                });
                            }); })];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5: return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, "Hej, właśnie skończył się Twój urlop!")];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); }) });
});
