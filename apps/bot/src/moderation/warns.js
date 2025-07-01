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
exports.warns = exports.createWarnFormat = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var util_1 = require("./util");
var getWarn = function (tx, id, guildId) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    return [2 /*return*/, tx.warn.findFirst({ where: { guildId: guildId, id: id, deletedAt: null } })];
}); }); };
var createWarnFormat = function (_a) {
    var includeUser = _a.includeUser;
    return function (warn, _idx) {
        var id = warn.id, createdAt = warn.createdAt, deletedAt = warn.deletedAt, reason = warn.reason, moderatorId = warn.moderatorId, deleteReason = warn.deleteReason;
        var warnedUserMention = includeUser ? "".concat((0, discord_js_1.userMention)(warn.userId), " ") : "";
        var header = (0, discord_js_1.heading)("".concat(warnedUserMention).concat((0, discord_js_1.userMention)(moderatorId), " ").concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.ShortDateTime), " [").concat(id, "]"), discord_js_1.HeadingLevel.Three);
        var lines = [
            deletedAt ? (0, discord_js_1.strikethrough)(header) : header,
            "Pow\u00F3d: ".concat((0, discord_js_1.italic)(reason)),
        ];
        if (deletedAt) {
            lines.push("Data usuni\u0119cia: ".concat((0, discord_js_1.time)(deletedAt, discord_js_1.TimestampStyles.ShortDateTime)));
        }
        if (deleteReason) {
            lines.push("Pow\u00F3d usuni\u0119cia: ".concat((0, discord_js_1.italic)(deleteReason)));
        }
        return lines.join("\n");
    };
};
exports.createWarnFormat = createWarnFormat;
var getUserWarnsPaginatedView = function (prisma, user, guildId, deleted) {
    var where = __assign({ guildId: guildId, userId: user.id }, (deleted ? {} : { deletedAt: null }));
    var paginate = new db_1.DatabasePaginator(function (props, createdAt) {
        return prisma.warn.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
    }, function () { return prisma.warn.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
    var formatWarn = (0, exports.createWarnFormat)({ includeUser: false });
    return new core_1.PaginatedView(paginate, "Ostrze\u017Cenia ".concat(user.tag), formatWarn, true, "ID: ".concat(user.id));
};
var universalAddWarn = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var warn, sentMessage;
    var prisma = _b.prisma, log = _b.log, user = _b.user, moderator = _b.moderator, guild = _b.guild, reason = _b.reason, reply = _b.reply, replyToModerator = _b.replyToModerator;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [user, moderator])];
            case 1:
                _c.sent();
                return [4 /*yield*/, prisma.warn.create({
                        data: {
                            guildId: guild.id,
                            userId: user.id,
                            moderatorId: moderator.id,
                            reason: reason,
                        },
                    })];
            case 2:
                warn = _c.sent();
                log.push("warnCreate", guild, { warn: warn, moderator: moderator });
                return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, "Hejka! Przed chwil\u0105 ".concat((0, discord_js_1.userMention)(moderator.id), " (").concat(moderator.tag, ") na\u0142o\u017Cy\u0142 Ci kar\u0119 ostrze\u017Cenia (warn). Powodem Twojego ostrze\u017Cenia jest: ").concat((0, discord_js_1.italic)(reason), ".\n\nPrzeczytaj pow\u00F3d ostrze\u017Cenia i nie r\u00F3b wi\u0119cej tego za co zosta\u0142x\u015B ostrze\u017Cony. W innym razie mo\u017Cesz otrzyma\u0107 kar\u0119 wyciszenia."))];
            case 3:
                sentMessage = _c.sent();
                return [4 /*yield*/, reply("Dodano ostrze\u017Cenie [".concat((0, discord_js_1.inlineCode)(warn.id.toString()), "] dla ").concat((0, util_1.formatUserWithId)(user), ".\nPow\u00F3d: ").concat((0, discord_js_1.italic)(reason)))];
            case 4:
                _c.sent();
                if (!!sentMessage) return [3 /*break*/, 6];
                return [4 /*yield*/, replyToModerator("Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, util_1.formatUserWithId)(user), "."))];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6: return [2 /*return*/];
        }
    });
}); };
var handleContextMenu = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var modalRows, customId, modal, submitAction, moderatorDmChannel, reason;
    var _c;
    var _d, _e;
    var prisma = _b.prisma, log = _b.log, itx = _b.itx, user = _b.user;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                modalRows = [
                    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                        .setCustomId("reason")
                        .setLabel("Powód")
                        .setRequired(true)
                        .setPlaceholder("Grzeczniej")
                        .setMaxLength(500)
                        .setStyle(discord_js_1.TextInputStyle.Paragraph)),
                ];
                customId = "warn-".concat(itx.targetId, "-").concat(itx.commandType);
                modal = (_c = new discord_js_1.ModalBuilder()
                    .setCustomId(customId)
                    .setTitle("Ostrze\u017C ".concat(user.tag)))
                    .addComponents.apply(_c, modalRows);
                return [4 /*yield*/, itx.showModal(modal)];
            case 1:
                _f.sent();
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                        return itx.awaitModalSubmit({
                            time: 60000 * 5,
                            filter: function (modal) { return modal.customId === customId; },
                        });
                    }, [discord_js_1.DiscordjsErrorCodes.InteractionCollectorError], function () { return null; })];
            case 2:
                submitAction = _f.sent();
                if (!submitAction)
                    return [2 /*return*/];
                // Any reply is needed in order to successfully finish the modal interaction
                return [4 /*yield*/, submitAction.deferReply({ flags: "Ephemeral" })];
            case 3:
                // Any reply is needed in order to successfully finish the modal interaction
                _f.sent();
                return [4 /*yield*/, itx.user.createDM()];
            case 4:
                moderatorDmChannel = _f.sent();
                reason = (_e = (_d = submitAction.components
                    .at(0)) === null || _d === void 0 ? void 0 : _d.components.find(function (c) { return c.customId === "reason"; })) === null || _e === void 0 ? void 0 : _e.value;
                if (!!reason) return [3 /*break*/, 6];
                return [4 /*yield*/, moderatorDmChannel.send("Nie podano wszystkich wymaganych danych do nałożenia ostrzeżenia!")];
            case 5:
                _f.sent();
                return [2 /*return*/];
            case 6: return [4 /*yield*/, universalAddWarn({
                    prisma: prisma,
                    log: log,
                    user: user,
                    moderator: itx.user,
                    guild: itx.guild,
                    reason: reason,
                    reply: function (content) { return moderatorDmChannel.send(content); },
                    replyToModerator: function (content) { return moderatorDmChannel.send(content); },
                })];
            case 7:
                _f.sent();
                return [4 /*yield*/, submitAction.deleteReply()];
            case 8:
                _f.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.warns = new core_1.Hashira({ name: "warns" })
    .use(base_1.base)
    .group("warn", function (group) {
    return group
        .setDescription("Zarządzaj ostrzeżeniami")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false)
        .addCommand("add", function (command) {
        return command
            .setDescription("Dodaj ostrzeżenie")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addString("reason", function (reason) { return reason.setDescription("Powód ostrzeżenia"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.moderationLog;
            var user = _d.user, reason = _d.reason;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, universalAddWarn({
                                prisma: prisma,
                                log: log,
                                user: user,
                                moderator: itx.user,
                                guild: itx.guild,
                                reason: reason,
                                reply: function (content) { return itx.followUp(content); },
                                replyToModerator: function (content) {
                                    return itx.followUp({ content: content, flags: "Ephemeral" });
                                },
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("remove", function (command) {
        return command
            .setDescription("Usuń ostrzeżenie")
            .addInteger("id", function (id) { return id.setDescription("ID ostrzeżenia").setMinValue(0); })
            .addString("reason", function (reason) {
            return reason.setDescription("Powód usunięcia ostrzeżenia").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var warn;
            var prisma = _c.prisma, log = _c.moderationLog;
            var id = _d.id, reason = _d.reason;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var warn;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getWarn(tx, id, itx.guildId)];
                                        case 1:
                                            warn = _a.sent();
                                            if (!!warn) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono ostrzeżenia o podanym ID")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/, null];
                                        case 3: return [4 /*yield*/, tx.warn.update({
                                                where: { id: id },
                                                data: { deletedAt: new Date(), deleteReason: reason },
                                            })];
                                        case 4:
                                            _a.sent();
                                            log.push("warnRemove", itx.guild, {
                                                warn: warn,
                                                moderator: itx.user,
                                                removeReason: reason,
                                            });
                                            return [2 /*return*/, warn];
                                    }
                                });
                            }); })];
                    case 2:
                        warn = _e.sent();
                        if (!warn)
                            return [2 /*return*/];
                        if (!reason) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.editReply("Usuni\u0119to ostrze\u017Cenie ".concat((0, discord_js_1.inlineCode)(id.toString()), ".\nPow\u00F3d usuni\u0119cia: ").concat((0, discord_js_1.italic)(reason)))];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        itx.editReply("Usuni\u0119to ostrze\u017Cenie ".concat((0, discord_js_1.inlineCode)(id.toString())));
                        _e.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edit", function (command) {
        return command
            .setDescription("Edytuj ostrzeżenie")
            .addInteger("id", function (id) { return id.setDescription("ID ostrzeżenia").setMinValue(0); })
            .addString("reason", function (reason) {
            return reason.setDescription("Nowy powód ostrzeżenia");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var warn;
            var prisma = _c.prisma, log = _c.moderationLog;
            var id = _d.id, reason = _d.reason;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var warn, originalReason;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getWarn(tx, id, itx.guildId)];
                                        case 1:
                                            warn = _a.sent();
                                            if (!!warn) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono ostrzeżenia o podanym ID")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/, null];
                                        case 3:
                                            originalReason = warn.reason;
                                            return [4 /*yield*/, tx.warn.update({
                                                    where: { id: id },
                                                    data: { reason: reason },
                                                })];
                                        case 4:
                                            _a.sent();
                                            log.push("warnEdit", itx.guild, {
                                                warn: warn,
                                                moderator: itx.user,
                                                oldReason: originalReason,
                                                newReason: reason,
                                            });
                                            return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                                    var member;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, itx.guild.members.fetch(warn.userId)];
                                                            case 1:
                                                                member = _a.sent();
                                                                return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, "Twoje ostrze\u017Cenie zosta\u0142o zedytowane przez ".concat((0, discord_js_1.userMention)(itx.user.id), " (").concat(itx.user.tag, ").\n\nPoprzedni pow\u00F3d ostrze\u017Cenia: ").concat((0, discord_js_1.italic)(originalReason), "\nNowy pow\u00F3d ostrze\u017Cenia: ").concat((0, discord_js_1.italic)(reason)))];
                                                            case 2:
                                                                _a.sent();
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                                    return [2 /*return*/];
                                                }); }); })];
                                        case 5:
                                            _a.sent();
                                            return [2 /*return*/, warn];
                                    }
                                });
                            }); })];
                    case 2:
                        warn = _e.sent();
                        if (!warn)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.editReply("Zaktualizowano ostrze\u017Cenie ".concat((0, discord_js_1.inlineCode)(id.toString()), ". Nowy pow\u00F3d: ").concat((0, discord_js_1.italic)(reason)))];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .group("warns", function (group) {
    return group
        .setDescription("Wyświetl ostrzeżenia")
        .setDMPermission(false)
        .addCommand("user", function (command) {
        return command
            .setDescription("Wyświetl ostrzeżenia użytkownika")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addBoolean("deleted", function (deleted) {
            return deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var paginatedView;
            var prisma = _c.prisma;
            var user = _d.user, deleted = _d.deleted;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        paginatedView = getUserWarnsPaginatedView(prisma, user, itx.guildId, deleted);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("me", function (command) {
        return command
            .setDescription("Wyświetl swoje ostrzeżenia")
            .addBoolean("deleted", function (deleted) {
            return deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var paginatedView;
            var prisma = _c.prisma;
            var deleted = _d.deleted;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        paginatedView = getUserWarnsPaginatedView(prisma, itx.user, itx.guildId, deleted);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .userContextMenu("warn", discord_js_1.PermissionFlagsBits.ModerateMembers, function (_a, itx_1) { return __awaiter(void 0, [_a, itx_1], void 0, function (_b, itx) {
    var prisma = _b.prisma, log = _b.moderationLog;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleContextMenu({
                        prisma: prisma,
                        log: log,
                        itx: itx,
                        user: itx.targetUser,
                    })];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); })
    .messageContextMenu("warn", discord_js_1.PermissionFlagsBits.ModerateMembers, function (_a, itx_1) { return __awaiter(void 0, [_a, itx_1], void 0, function (_b, itx) {
    var prisma = _b.prisma, log = _b.moderationLog;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleContextMenu({
                        prisma: prisma,
                        log: log,
                        itx: itx,
                        user: itx.targetMessage.author,
                    })];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
