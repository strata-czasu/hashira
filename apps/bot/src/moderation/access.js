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
exports.access = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var discordTry_1 = require("../util/discordTry");
var duration_1 = require("../util/duration");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var accessUtil_1 = require("./accessUtil");
var createRestrictionFormatter = function (_a) {
    var includeUser = _a.includeUser, includeChannel = _a.includeChannel;
    return function (restriction) {
        var headerParts = [];
        if (includeUser)
            headerParts.push((0, discord_js_1.userMention)(restriction.userId));
        if (includeChannel)
            headerParts.push((0, discord_js_1.channelMention)(restriction.channelId));
        headerParts.push("".concat((0, discord_js_1.userMention)(restriction.moderatorId), " ").concat((0, discord_js_1.time)(restriction.createdAt, discord_js_1.TimestampStyles.ShortDateTime), " [").concat(restriction.id, "]"));
        var header = (0, discord_js_1.heading)(headerParts.join(" "), discord_js_1.HeadingLevel.Three);
        var lines = [restriction.deletedAt ? (0, discord_js_1.strikethrough)(header) : header];
        lines.push("".concat((0, discord_js_1.bold)("Powód"), ": ").concat((0, discord_js_1.italic)(restriction.reason)));
        if (restriction.endsAt)
            lines.push("".concat((0, discord_js_1.bold)("Koniec"), ": ").concat((0, discord_js_1.time)(restriction.endsAt, discord_js_1.TimestampStyles.RelativeTime)));
        if (restriction.deletedAt)
            lines.push("".concat((0, discord_js_1.bold)("Data przywrócenia"), ": ").concat((0, discord_js_1.time)(restriction.deletedAt, discord_js_1.TimestampStyles.ShortDateTime)));
        if (restriction.deleteReason)
            lines.push("".concat((0, discord_js_1.bold)("Powód przywrócenia"), ": ").concat((0, discord_js_1.italic)(restriction.deleteReason)));
        return lines.join("\n");
    };
};
exports.access = new core_1.Hashira({ name: "access" })
    .use(base_1.base)
    .group("dostepy", function (group) {
    return group
        .setDescription("Zarządzaj dostępem do kanałów")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("odbierz", function (command) {
        return command
            .setDescription("Odbierz dostęp do kanału")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addString("powód", function (reason) { return reason.setDescription("Powód"); })
            .addChannel("kanał", function (channel) {
            return channel.setDescription("Kanał").setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .addString("czas", function (czas) {
            return czas.setDescription("Czas blokady").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var existing, duration, endsAt, restriction, result, sentMessage, lines;
            var prisma = _c.prisma, messageQueue = _c.messageQueue, log = _c.moderationLog;
            var user = _d.user, reason = _d.powód, rawDuration = _d.czas, channel = _d.kanał;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        if (!channel.isTextBased() || !channel.guild) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Kanał musi być tekstowy")];
                        }
                        return [4 /*yield*/, prisma.channelRestriction.findFirst({
                                where: {
                                    guildId: itx.guildId,
                                    channelId: channel.id,
                                    userId: user.id,
                                    deletedAt: null,
                                },
                            })];
                    case 2:
                        existing = _e.sent();
                        if (existing) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Użytkownik ma już odebrany dostęp")];
                        }
                        duration = rawDuration ? (0, duration_1.parseDuration)(rawDuration) : null;
                        if (rawDuration && !duration) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy format czasu")];
                        }
                        endsAt = duration ? (0, date_fns_1.add)(itx.createdAt, duration) : null;
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [user, itx.user])];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, prisma.channelRestriction.create({
                                data: {
                                    guildId: itx.guildId,
                                    channelId: channel.id,
                                    userId: user.id,
                                    moderatorId: itx.user.id,
                                    reason: reason,
                                    endsAt: endsAt,
                                },
                            })];
                    case 4:
                        restriction = _e.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                                return channel.permissionOverwrites.edit(user, { ViewChannel: false }, { reason: reason });
                            }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return null; })];
                    case 5:
                        result = _e.sent();
                        if (!result) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Brak permisji do edycji kanału")];
                        }
                        if (!endsAt) return [3 /*break*/, 7];
                        return [4 /*yield*/, messageQueue.push("channelRestrictionEnd", { restrictionId: restriction.id }, 
                            // biome-ignore lint/style/noNonNullAssertion: flow ensures duration is defined and is parseable
                            (0, duration_1.durationToSeconds)(duration), restriction.id.toString())];
                    case 6:
                        _e.sent();
                        _e.label = 7;
                    case 7:
                        log.push("channelRestrictionCreate", itx.guild, {
                            restriction: restriction,
                            moderator: itx.user,
                        });
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, (0, accessUtil_1.composeChannelRestrictionMessage)(user, itx.user, channel.id, reason, endsAt))];
                    case 8:
                        sentMessage = _e.sent();
                        lines = [
                            "Odebrano dost\u0119p do kana\u0142u ".concat((0, discord_js_1.channelMention)(channel.id), " dla ").concat((0, discord_js_1.userMention)(user.id)),
                            "**Pow\u00F3d**: ".concat((0, discord_js_1.italic)(reason)),
                        ];
                        if (endsAt) {
                            lines.push("**Koniec**: ".concat((0, discord_js_1.time)(endsAt, discord_js_1.TimestampStyles.RelativeTime)));
                        }
                        if (!sentMessage) {
                            lines.push("Nie udało się wysłać wiadomości do użytkownika.");
                        }
                        return [4 /*yield*/, itx.editReply(lines.join("\n"))];
                    case 9:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("przywroc", function (command) {
        return command
            .setDescription("Przywróć dostęp do kanału")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addString("powód", function (reason) {
            return reason.setDescription("Powód przywrócenia").setRequired(false);
        })
            .addChannel("kanał", function (channel) {
            return channel
                .setDescription("Kanał")
                .setRequired(false)
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var restriction, result, sentMessage, lines;
            var prisma = _c.prisma, messageQueue = _c.messageQueue, log = _c.moderationLog;
            var user = _d.user, reason = _d.powód, channel = _d.kanał;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        if (!channel || !channel.isTextBased()) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Kanał musi być tekstowy")];
                        }
                        return [4 /*yield*/, prisma.channelRestriction.findFirst({
                                where: {
                                    guildId: itx.guildId,
                                    channelId: channel.id,
                                    userId: user.id,
                                    deletedAt: null,
                                },
                            })];
                    case 2:
                        restriction = _e.sent();
                        if (!restriction) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Użytkownik nie ma odebranego dostępu")];
                        }
                        return [4 /*yield*/, prisma.channelRestriction.update({
                                where: { id: restriction.id },
                                data: { deletedAt: itx.createdAt, deleteReason: reason },
                            })];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, messageQueue.cancel("channelRestrictionEnd", restriction.id.toString())];
                    case 4:
                        _e.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return channel.permissionOverwrites.delete(user, reason !== null && reason !== void 0 ? reason : undefined); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return null; })];
                    case 5:
                        result = _e.sent();
                        if (!result) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Brak permisji do edycji kanału")];
                        }
                        log.push("channelRestrictionRemove", itx.guild, {
                            restriction: restriction,
                            moderator: itx.user,
                            removeReason: reason,
                        });
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, (0, accessUtil_1.composeChannelRestrictionRestoreMessage)(user, channel.id, reason))];
                    case 6:
                        sentMessage = _e.sent();
                        lines = [
                            "Przywr\u00F3cono dost\u0119p do ".concat((0, discord_js_1.channelMention)(channel.id), " dla ").concat((0, discord_js_1.userMention)(user.id)),
                        ];
                        if (reason) {
                            lines.push("**Pow\u00F3d przywr\u00F3cenia**: ".concat((0, discord_js_1.italic)(reason)));
                        }
                        if (!sentMessage) {
                            lines.push("Nie udało się wysłać wiadomości do użytkownika.");
                        }
                        return [4 /*yield*/, itx.editReply(lines.join("\n"))];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("kanal", function (command) {
        return command
            .setDescription("Wyświetl odebrane dostępy na kanale")
            .addChannel("channel", function (ch) {
            return ch
                .setDescription("Kanał")
                .setRequired(false)
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var targetChannel, where, paginator, view;
            var prisma = _c.prisma;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        targetChannel = channel !== null && channel !== void 0 ? channel : itx.channel;
                        if (!targetChannel || !targetChannel.isTextBased())
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Kanał musi być tekstowy")];
                        where = {
                            guildId: itx.guildId,
                            channelId: targetChannel.id,
                        };
                        paginator = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.channelRestriction.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.channelRestriction.count({ where: where }); }, { pageSize: 10, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        view = new core_1.PaginatedView(paginator, "Odebrane dost\u0119py na ".concat((0, discord_js_1.channelMention)(targetChannel.id)), createRestrictionFormatter({ includeUser: true, includeChannel: false }), true);
                        return [4 /*yield*/, view.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("user", function (command) {
        return command
            .setDescription("Wyświetl odebrane dostępy użytkownika")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var where, paginator, view;
            var prisma = _c.prisma;
            var user = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = {
                            guildId: itx.guildId,
                            userId: user.id,
                        };
                        paginator = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.channelRestriction.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.channelRestriction.count({ where: where }); }, { pageSize: 10, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        view = new core_1.PaginatedView(paginator, "Odebrane dost\u0119py u\u017Cytkownika ".concat(user.tag), createRestrictionFormatter({ includeUser: false, includeChannel: true }), true);
                        return [4 /*yield*/, view.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
