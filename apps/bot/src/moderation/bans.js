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
exports.bans = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var specializedConstants_1 = require("../specializedConstants");
var discordTry_1 = require("../util/discordTry");
var duration_1 = require("../util/duration");
var errorFollowUp_1 = require("../util/errorFollowUp");
var hasHigherRole_1 = require("../util/hasHigherRole");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var util_1 = require("./util");
var BanDeleteInterval;
(function (BanDeleteInterval) {
    BanDeleteInterval[BanDeleteInterval["None"] = 0] = "None";
    BanDeleteInterval[BanDeleteInterval["OneHour"] = 1] = "OneHour";
    BanDeleteInterval[BanDeleteInterval["SixHours"] = 6] = "SixHours";
    BanDeleteInterval[BanDeleteInterval["TwelveHours"] = 12] = "TwelveHours";
    BanDeleteInterval[BanDeleteInterval["OneDay"] = 24] = "OneDay";
    BanDeleteInterval[BanDeleteInterval["ThreeDays"] = 72] = "ThreeDays";
    BanDeleteInterval[BanDeleteInterval["SevenDays"] = 168] = "SevenDays";
})(BanDeleteInterval || (BanDeleteInterval = {}));
var getBanDeleteSeconds = function (deleteInterval) {
    return deleteInterval * 3600;
};
var applyBan = function (itx, user, moderator, reason, deleteMessageSeconds) { return __awaiter(void 0, void 0, void 0, function () {
    var sentMessage, banReason;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, "Hejka! Przed chwil\u0105 na\u0142o\u017Cy\u0142em Ci kar\u0119 bana. Powodem Twojego bana jest ".concat((0, discord_js_1.italic)(reason), "\n\nOd bana mo\u017Cesz odwo\u0142a\u0107 si\u0119 wype\u0142niaj\u0105c formularz z tego linka: ").concat((0, discord_js_1.hideLinkEmbed)(specializedConstants_1.STRATA_CZASU.BAN_APPEAL_URL), "."))];
            case 1:
                sentMessage = _a.sent();
                banReason = (0, util_1.formatBanReason)(reason, itx.user, itx.createdAt);
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!!deleteMessageSeconds) return [3 /*break*/, 2];
                                    return [4 /*yield*/, itx.guild.members.ban(user, { reason: banReason })];
                                case 1:
                                    _a.sent();
                                    return [3 /*break*/, 4];
                                case 2: return [4 /*yield*/, itx.guild.members.ban(user, {
                                        reason: banReason,
                                        deleteMessageSeconds: deleteMessageSeconds,
                                    })];
                                case 3:
                                    _a.sent();
                                    _a.label = 4;
                                case 4: return [4 /*yield*/, itx.editReply("Zbanowano ".concat((0, util_1.formatUserWithId)(user), ".\nPow\u00F3d: ").concat((0, discord_js_1.italic)(reason)))];
                                case 5:
                                    _a.sent();
                                    if (!!sentMessage) return [3 /*break*/, 7];
                                    return [4 /*yield*/, moderator.send("Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, util_1.formatUserWithId)(user), "."))];
                                case 6:
                                    _a.sent();
                                    _a.label = 7;
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie mam uprawnień do zbanowania tego użytkownika.")];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var BAN_FIXUP_GUILDS = [
    specializedConstants_1.GUILD_IDS.Homik,
    specializedConstants_1.GUILD_IDS.Piwnica,
    specializedConstants_1.GUILD_IDS.StrataCzasu,
];
var handleContextMenu = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var modalRows, customId, modal, submitAction, reason, rawDeleteInterval, deleteMessageSeconds, parsedDuration;
    var _c;
    var _d, _e, _f, _g;
    var itx = _b.itx, user = _b.user;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                modalRows = [
                    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                        .setCustomId("reason")
                        .setLabel("Powód bana")
                        .setRequired(true)
                        .setMinLength(2)
                        .setStyle(discord_js_1.TextInputStyle.Paragraph)),
                    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                        .setCustomId("delete-interval")
                        .setLabel("Przedział czasowy usuwania wiadomości")
                        .setRequired(false)
                        .setPlaceholder("1h, 6h, 12h, 1d, 3d, 7d")
                        .setMinLength(2)
                        .setStyle(discord_js_1.TextInputStyle.Short)),
                ];
                customId = "ban-".concat(user.id, "-").concat(itx.commandType);
                modal = (_c = new discord_js_1.ModalBuilder()
                    .setCustomId(customId)
                    .setTitle("Zbanuj ".concat(user.tag)))
                    .addComponents.apply(_c, modalRows);
                return [4 /*yield*/, itx.showModal(modal)];
            case 1:
                _h.sent();
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                        return itx.awaitModalSubmit({
                            time: 60000 * 5,
                            filter: function (modal) { return modal.customId === customId; },
                        });
                    }, [discord_js_1.DiscordjsErrorCodes.InteractionCollectorError], function () { return null; })];
            case 2:
                submitAction = _h.sent();
                if (!submitAction)
                    return [2 /*return*/];
                return [4 /*yield*/, submitAction.deferReply()];
            case 3:
                _h.sent();
                reason = (_e = (_d = submitAction.components
                    .at(0)) === null || _d === void 0 ? void 0 : _d.components.find(function (c) { return c.customId === "reason"; })) === null || _e === void 0 ? void 0 : _e.value;
                rawDeleteInterval = ((_g = (_f = submitAction.components
                    .at(1)) === null || _f === void 0 ? void 0 : _f.components.find(function (c) { return c.customId === "delete-interval"; })) === null || _g === void 0 ? void 0 : _g.value) || null;
                if (!!reason) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nie podano wszystkich wymaganych danych!")];
            case 4: return [2 /*return*/, _h.sent()];
            case 5:
                deleteMessageSeconds = null;
                if (!rawDeleteInterval) return [3 /*break*/, 8];
                parsedDuration = (0, duration_1.parseDuration)(rawDeleteInterval);
                if (!!parsedDuration) return [3 /*break*/, 7];
                return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`")];
            case 6: return [2 /*return*/, _h.sent()];
            case 7:
                deleteMessageSeconds = (0, duration_1.durationToSeconds)(parsedDuration);
                _h.label = 8;
            case 8: return [4 /*yield*/, applyBan(submitAction, user, itx.member.user, reason, deleteMessageSeconds)];
            case 9:
                _h.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.bans = new core_1.Hashira({ name: "bans" })
    .use(base_1.base)
    .command("ban", function (command) {
    return command
        .setDescription("Zbanuj użytkownika")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
        .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
        .addString("reason", function (reason) {
        return reason.setDescription("Powód bana").setEscaped(true);
    })
        .addNumber("delete-interval", function (deleteInterval) {
        return deleteInterval
            .setDescription("Przedział czasowy usuwania wiadomości")
            .setRequired(false)
            .addChoices({ name: "Brak", value: BanDeleteInterval.None }, { name: "1 godzina", value: BanDeleteInterval.OneHour }, { name: "6 godzin", value: BanDeleteInterval.SixHours }, { name: "12 godzin", value: BanDeleteInterval.TwelveHours }, { name: "1 dzień", value: BanDeleteInterval.OneDay }, { name: "3 dni", value: BanDeleteInterval.ThreeDays }, { name: "7 dni", value: BanDeleteInterval.SevenDays });
    })
        .handle(function (_ctx_1, _a, itx_1) { return __awaiter(void 0, [_ctx_1, _a, itx_1], void 0, function (_ctx, _b, itx) {
        var member, banDeleteSeconds;
        var user = _b.user, reason = _b.reason, deleteInterval = _b["delete-interval"];
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _c.sent();
                    member = itx.guild.members.cache.get(user.id);
                    if (!(member && (0, hasHigherRole_1.hasHigherRole)(member, itx.member))) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie możesz zbanować użytkownika z wyższą rolą.")];
                case 2: return [2 /*return*/, _c.sent()];
                case 3:
                    banDeleteSeconds = deleteInterval
                        ? getBanDeleteSeconds(deleteInterval)
                        : null;
                    return [4 /*yield*/, applyBan(itx, user, itx.member.user, reason, banDeleteSeconds)];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .command("unban", function (command) {
    return command
        .setDescription("Odbanuj użytkownika")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
        .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
        .addString("reason", function (reason) {
        return reason.setDescription("Powód zdjęcia bana").setRequired(false).setEscaped(true);
    })
        .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
        var user = _b.user, reason = _b.reason;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var message;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, itx.guild.members.unban(user, reason !== null && reason !== void 0 ? reason : undefined)];
                                    case 1:
                                        _a.sent();
                                        message = reason
                                            ? "Odbanowano ".concat((0, util_1.formatUserWithId)(user), ".\nPow\u00F3d: ").concat((0, discord_js_1.italic)(reason))
                                            : "Odbanowano ".concat((0, util_1.formatUserWithId)(user));
                                        return [4 /*yield*/, itx.editReply(message)];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, [discord_js_1.RESTJSONErrorCodes.UnknownBan], function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "U\u017Cytkownik ".concat((0, util_1.formatUserWithId)(user), " nie ma bana."))];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .command("checkban", function (command) {
    return command
        .setDescription("Sprawdź, czy użytkownik jest zbanowany")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
        .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
        .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
        var user = _b.user;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var ban;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, itx.guild.bans.fetch(user)];
                                    case 1:
                                        ban = _b.sent();
                                        return [4 /*yield*/, itx.editReply("".concat((0, util_1.formatUserWithId)(user), " ma bana.\nPow\u00F3d: ").concat((0, discord_js_1.italic)((_a = ban.reason) !== null && _a !== void 0 ? _a : "Brak")))];
                                    case 2:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, [discord_js_1.RESTJSONErrorCodes.UnknownBan], function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, itx.editReply("".concat((0, util_1.formatUserWithId)(user), " nie ma bana."))];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .userContextMenu("ban", discord_js_1.PermissionFlagsBits.BanMembers, function (_ctx, itx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleContextMenu({
                        itx: itx,
                        user: itx.targetUser,
                    })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .messageContextMenu("ban", discord_js_1.PermissionFlagsBits.BanMembers, function (_ctx, itx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleContextMenu({
                        itx: itx,
                        user: itx.targetMessage.author,
                    })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .handle("guildBanAdd", function (_1, _a) { return __awaiter(void 0, [_1, _a], void 0, function (_, _b) {
    var auditLogs, entry, reason;
    var _c, _d;
    var guild = _b.guild, user = _b.user;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                // NOTE: This event could fire multiple times for unknown reasons
                if (!BAN_FIXUP_GUILDS.includes(guild.id))
                    return [2 /*return*/];
                return [4 /*yield*/, guild.fetchAuditLogs({
                        type: discord_js_1.AuditLogEvent.MemberBanAdd,
                        limit: 5,
                    })];
            case 1:
                auditLogs = _e.sent();
                entry = auditLogs.entries.find(function (entry) { return entry.targetId === user.id; });
                if (!entry || ((_c = entry.executor) === null || _c === void 0 ? void 0 : _c.bot))
                    return [2 /*return*/];
                return [4 /*yield*/, guild.members.unban(user, "Poprawienie powodu po manualnym zbanowaniu")];
            case 2:
                _e.sent();
                reason = (0, util_1.formatBanReason)((_d = entry.reason) !== null && _d !== void 0 ? _d : "Brak powodu", entry.executor, entry.createdAt);
                return [4 /*yield*/, guild.members.ban(user, { reason: reason })];
            case 3:
                _e.sent();
                return [2 /*return*/];
        }
    });
}); });
