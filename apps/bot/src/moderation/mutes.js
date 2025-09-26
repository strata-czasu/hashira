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
exports.mutes = exports.universalAddMute = exports.createFormatMuteInList = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var date_fns_1 = require("date-fns");
var fp_1 = require("date-fns/fp");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var ultimatum_1 = require("../strata/ultimatum");
var discordTry_1 = require("../util/discordTry");
var duration_1 = require("../util/duration");
var errorFollowUp_1 = require("../util/errorFollowUp");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var util_1 = require("./util");
var MUTE_TEMPLATE = "\n## Hejka {{user}}!\nPrzed chwil\u0105 {{moderator}} na\u0142o\u017Cy\u0142 Ci kar\u0119 wyciszenia (rola Mute). Musia\u0142em wi\u0119c niestety odebra\u0107 Ci prawo do pisania i m\u00F3wienia na **{{duration}}**.\n\n**Oto pow\u00F3d Twojego wyciszenia:**\n{{reason}}\n\nPrzeczytaj prosz\u0119 nasze Zasady dost\u0119pne pod [tym linkiem](https://discord.com/channels/211261411119202305/873167662082056232/1270484486131290255) i je\u017Celi nie zgadzasz si\u0119 z powodem Twojej kary, to odwo\u0142aj si\u0119 od niej klikaj\u0105c czerwony przycisk \"Odwo\u0142aj si\u0119\" na naszym [kanale od ticket\u00F3w](https://discord.com/channels/211261411119202305/1213901611836117052/1219338768012804106). W odwo\u0142aniu spinguj nick osoby, kt\u00F3ra na\u0142o\u017Cy\u0142a Ci kar\u0119.\n\nPozdrawiam,\nBiszkopt";
var composeMuteMessage = function (user, moderator, duration, reason) {
    return MUTE_TEMPLATE.replace("{{user}}", user.toString())
        .replace("{{moderator}}", "".concat(moderator, " (").concat(moderator.tag, ")"))
        .replace("{{duration}}", (0, duration_1.formatDuration)(duration))
        .replace("{{reason}}", (0, discord_js_1.italic)(reason));
};
var createFormatMuteInList = function (_a) {
    var includeUser = _a.includeUser;
    return function (mute, _idx) {
        var id = mute.id, createdAt = mute.createdAt, deletedAt = mute.deletedAt, reason = mute.reason, moderatorId = mute.moderatorId, deleteReason = mute.deleteReason, userId = mute.userId;
        var mutedUserMention = includeUser ? "".concat((0, discord_js_1.userMention)(userId), " ") : "";
        var header = (0, discord_js_1.heading)("".concat(mutedUserMention).concat((0, discord_js_1.userMention)(moderatorId), " ").concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.ShortDateTime), " [").concat(id, "]"), discord_js_1.HeadingLevel.Three);
        var lines = [
            deletedAt ? (0, discord_js_1.strikethrough)(header) : header,
            "".concat((0, discord_js_1.bold)("Czas trwania"), ": ").concat((0, util_1.formatMuteLength)(mute)),
            "".concat((0, discord_js_1.bold)("Powód"), ": ").concat((0, discord_js_1.italic)(reason)),
        ];
        if (deletedAt) {
            lines.push("".concat((0, discord_js_1.bold)("Data usunięcia"), ": ").concat((0, discord_js_1.time)(deletedAt, discord_js_1.TimestampStyles.ShortDateTime)));
        }
        if (deleteReason) {
            lines.push("".concat((0, discord_js_1.bold)("Powód usunięcia"), ": ").concat((0, discord_js_1.italic)(deleteReason)));
        }
        return lines.join("\n");
    };
};
exports.createFormatMuteInList = createFormatMuteInList;
var getUserMutesPaginatedView = function (prisma, user, guildId, deleted) {
    var where = __assign({ guildId: guildId, userId: user.id }, (deleted ? {} : { deletedAt: null }));
    var paginate = new db_1.DatabasePaginator(function (props, createdAt) {
        return prisma.mute.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
    }, function () { return prisma.mute.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
    var formatMuteInList = (0, exports.createFormatMuteInList)({ includeUser: false });
    return new core_1.PaginatedView(paginate, "Wyciszenia ".concat(user.tag), formatMuteInList, true, "ID: ".concat(user.id));
};
var getMute = function (tx, id, guildId) {
    return tx.mute.findFirst({ where: { guildId: guildId, id: id, deletedAt: null } });
};
var handleUltimatum = function (prisma, member, replyToModerator) { return __awaiter(void 0, void 0, void 0, function () {
    var latestUltimatum, daysSinceEnd;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, ultimatum_1.getLatestUltimatum)(prisma, member.guild, member.user)];
            case 1:
                latestUltimatum = _a.sent();
                if (!latestUltimatum)
                    return [2 /*return*/];
                if (!(0, ultimatum_1.isUltimatumActive)(latestUltimatum)) return [3 /*break*/, 3];
                return [4 /*yield*/, replyToModerator("U\u017Cytkownik ".concat((0, util_1.formatUserWithId)(member), " ma aktywne ultimatum. Nale\u017Cy na\u0142o\u017Cy\u0107 bana."))];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                if (!latestUltimatum.endedAt) return [3 /*break*/, 5];
                daysSinceEnd = (0, fp_1.differenceInDays)(latestUltimatum.endedAt, new Date());
                if (!(daysSinceEnd < 30)) return [3 /*break*/, 5];
                return [4 /*yield*/, replyToModerator("Ostatnie ultimatum u\u017Cytkownika ".concat((0, util_1.formatUserWithId)(member), " zako\u0144czy\u0142o si\u0119 ").concat((0, discord_js_1.time)(latestUltimatum.endedAt, discord_js_1.TimestampStyles.RelativeTime), ". Nale\u017Cy na\u0142o\u017Cy\u0107 ponownie ultimatum."))];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [2 /*return*/];
        }
    });
}); };
var universalAddMute = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var member, guildId, now, activeMute, guildRoles, parsedDuration, endsAt, mute, appliedMute, sentMessage;
    var prisma = _b.prisma, messageQueue = _b.messageQueue, log = _b.log, userId = _b.userId, guild = _b.guild, moderator = _b.moderator, duration = _b.duration, reason = _b.reason, reply = _b.reply, replyToModerator = _b.replyToModerator;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, guild.members.fetch(userId)];
                }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, reply("Nie znaleziono podanego użytkownika na tym serwerze.")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/, null];
                        }
                    });
                }); })];
            case 1:
                member = _c.sent();
                if (!member)
                    return [2 /*return*/];
                guildId = guild.id;
                now = new Date();
                return [4 /*yield*/, prisma.mute.findFirst({
                        where: {
                            guildId: guildId,
                            userId: userId,
                            deletedAt: null,
                            endsAt: { gte: now },
                        },
                    })];
            case 2:
                activeMute = _c.sent();
                if (!activeMute) return [3 /*break*/, 4];
                return [4 /*yield*/, reply("U\u017Cytkownik jest ju\u017C wyciszony do ".concat((0, discord_js_1.time)(activeMute.endsAt, discord_js_1.TimestampStyles.RelativeTime), " przez ").concat((0, discord_js_1.userMention)(activeMute.moderatorId), ".\nPow\u00F3d: ").concat((0, discord_js_1.italic)(activeMute.reason)))];
            case 3:
                _c.sent();
                return [2 /*return*/];
            case 4: return [4 /*yield*/, (0, util_1.getGuildRolesIds)(prisma, guildId)];
            case 5:
                guildRoles = _c.sent();
                if (!!guildRoles.muteRoleId) return [3 /*break*/, 7];
                return [4 /*yield*/, reply("Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`")];
            case 6:
                _c.sent();
                return [2 /*return*/];
            case 7:
                parsedDuration = (0, duration_1.parseDuration)(duration);
                if (!!parsedDuration) return [3 /*break*/, 9];
                return [4 /*yield*/, reply("Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`")];
            case 8:
                _c.sent();
                return [2 /*return*/];
            case 9:
                if (!((0, duration_1.durationToSeconds)(parsedDuration) === 0)) return [3 /*break*/, 11];
                return [4 /*yield*/, reply("Nie można ustawić czasu trwania wyciszenia na 0")];
            case 10:
                _c.sent();
                return [2 /*return*/];
            case 11:
                endsAt = (0, date_fns_1.add)(now, parsedDuration);
                return [4 /*yield*/, prisma.mute.create({
                        data: {
                            createdAt: now,
                            endsAt: endsAt,
                            guild: { connect: { id: guildId } },
                            moderator: {
                                connectOrCreate: {
                                    create: { id: moderator.id },
                                    where: { id: moderator.id },
                                },
                            },
                            reason: reason,
                            user: {
                                connectOrCreate: {
                                    create: { id: userId },
                                    where: { id: userId },
                                },
                            },
                        },
                    })];
            case 12:
                mute = _c.sent();
                return [4 /*yield*/, (0, util_1.applyMute)(member, guildRoles.muteRoleId, "Wyciszenie: ".concat(reason, " [").concat(mute.id, "]"))];
            case 13:
                appliedMute = _c.sent();
                return [4 /*yield*/, messageQueue.push("muteEnd", { muteId: mute.id, guildId: guildId, userId: userId }, (0, duration_1.durationToSeconds)(parsedDuration), mute.id.toString())];
            case 14:
                _c.sent();
                log.push("muteCreate", guild, { mute: mute, moderator: moderator });
                return [4 /*yield*/, reply("Dodano wyciszenie [".concat((0, discord_js_1.inlineCode)(mute.id.toString()), "] dla ").concat((0, discord_js_1.userMention)(userId), ".\nPow\u00F3d: ").concat((0, discord_js_1.italic)(reason), "\nKoniec: ").concat((0, discord_js_1.time)(endsAt, discord_js_1.TimestampStyles.RelativeTime)))];
            case 15:
                _c.sent();
                if (!!appliedMute) return [3 /*break*/, 17];
                return [4 /*yield*/, reply("Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.")];
            case 16:
                _c.sent();
                throw new Error("Failed to apply mute for user ".concat(userId, " at guild ").concat(guildId));
            case 17: return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, composeMuteMessage(member.user, moderator, parsedDuration, reason))];
            case 18:
                sentMessage = _c.sent();
                if (!!sentMessage) return [3 /*break*/, 20];
                return [4 /*yield*/, replyToModerator("Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, discord_js_1.userMention)(userId), "."))];
            case 19:
                _c.sent();
                _c.label = 20;
            case 20: return [4 /*yield*/, handleUltimatum(prisma, member, replyToModerator)];
            case 21:
                _c.sent();
                return [2 /*return*/, mute];
        }
    });
}); };
exports.universalAddMute = universalAddMute;
var addMute = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var prisma = _b.prisma, messageQueue = _b.messageQueue, log = _b.log, itx = _b.itx, user = _b.user, rawDuration = _b.duration, reason = _b.reason;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, exports.universalAddMute)({
                    prisma: prisma,
                    messageQueue: messageQueue,
                    log: log,
                    userId: user.id,
                    guild: itx.guild,
                    moderator: itx.user,
                    duration: rawDuration,
                    reason: reason,
                    reply: function (content) { return itx.followUp({ content: content }); },
                    replyToModerator: function (content) { return itx.followUp({ content: content, flags: "Ephemeral" }); },
                })];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); };
var handleContextMenu = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var modalRows, customId, modal, submitAction, moderatorDmChannel, duration, reason;
    var _c;
    var _d, _e, _f, _g;
    var prisma = _b.prisma, messageQueue = _b.messageQueue, log = _b.log, itx = _b.itx, user = _b.user;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                modalRows = [
                    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                        .setCustomId("duration")
                        .setLabel("Czas trwania wyciszenia")
                        .setRequired(true)
                        .setPlaceholder("3h, 8h, 1d")
                        .setMinLength(2)
                        .setStyle(discord_js_1.TextInputStyle.Short)),
                    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                        .setCustomId("reason")
                        .setLabel("Powód")
                        .setRequired(true)
                        .setPlaceholder("Toxic")
                        .setMaxLength(500)
                        .setStyle(discord_js_1.TextInputStyle.Paragraph)),
                ];
                customId = "mute-".concat(user.id, "-").concat(itx.commandType);
                modal = (_c = new discord_js_1.ModalBuilder()
                    .setCustomId(customId)
                    .setTitle("Wycisz ".concat(user.tag)))
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
                // Any reply is needed in order to successfully finish the modal interaction
                return [4 /*yield*/, submitAction.deferReply({ flags: "Ephemeral" })];
            case 3:
                // Any reply is needed in order to successfully finish the modal interaction
                _h.sent();
                return [4 /*yield*/, itx.user.createDM()];
            case 4:
                moderatorDmChannel = _h.sent();
                duration = (_e = (_d = submitAction.components
                    .at(0)) === null || _d === void 0 ? void 0 : _d.components.find(function (c) { return c.customId === "duration"; })) === null || _e === void 0 ? void 0 : _e.value;
                reason = (_g = (_f = submitAction.components
                    .at(1)) === null || _f === void 0 ? void 0 : _f.components.find(function (c) { return c.customId === "reason"; })) === null || _g === void 0 ? void 0 : _g.value;
                if (!(!duration || !reason)) return [3 /*break*/, 6];
                return [4 /*yield*/, moderatorDmChannel.send("Nie podano wszystkich wymaganych danych do nałożenia wyciszenia!")];
            case 5:
                _h.sent();
                return [2 /*return*/];
            case 6: 
            // Send confirmation to the moderator's DM instead of itx.followUp()
            // This avoids an inconsistency in handling of itx.channel context menus
            // See https://github.com/strata-czasu/hashira/issues/75
            return [4 /*yield*/, (0, exports.universalAddMute)({
                    prisma: prisma,
                    messageQueue: messageQueue,
                    log: log,
                    userId: user.id,
                    guild: itx.guild,
                    moderator: itx.user,
                    duration: duration,
                    reason: reason,
                    reply: function (content) { return moderatorDmChannel.send(content); },
                    replyToModerator: function (content) { return moderatorDmChannel.send(content); },
                })];
            case 7:
                // Send confirmation to the moderator's DM instead of itx.followUp()
                // This avoids an inconsistency in handling of itx.channel context menus
                // See https://github.com/strata-czasu/hashira/issues/75
                _h.sent();
                // Don't send any message to the guild channel
                return [4 /*yield*/, submitAction.deleteReply()];
            case 8:
                // Don't send any message to the guild channel
                _h.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.mutes = new core_1.Hashira({ name: "mutes" })
    .use(base_1.base)
    .group("mute", function (group) {
    return group
        .setDescription("Zarządzaj wyciszeniami")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("add", function (command) {
        return command
            .setDescription("Wycisz użytkownika")
            .addUser("user", function (user) {
            return user.setDescription("Użytkownik, którego chcesz wyciszyć");
        })
            .addString("duration", function (duration) {
            return duration.setDescription("Czas trwania wyciszenia");
        })
            .addString("reason", function (reason) { return reason.setDescription("Powód wyciszenia"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, messageQueue = _c.messageQueue, log = _c.moderationLog;
            var user = _d.user, duration = _d.duration, reason = _d.reason;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, addMute({
                                prisma: prisma,
                                messageQueue: messageQueue,
                                log: log,
                                itx: itx,
                                user: user,
                                duration: duration,
                                reason: reason,
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
            .setDescription("Usuń wyciszenie")
            .addInteger("id", function (id) { return id.setDescription("ID wyciszenia").setMinValue(0); })
            .addString("reason", function (reason) {
            return reason.setDescription("Powód usunięcia wyciszenia").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var mute;
            var prisma = _c.prisma, messageQueue = _c.messageQueue, log = _c.moderationLog;
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
                                var mute;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getMute(tx, id, itx.guildId)];
                                        case 1:
                                            mute = _a.sent();
                                            if (!!mute) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono wyciszenia o podanym ID")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/, null];
                                        case 3: return [4 /*yield*/, prisma.mute.update({
                                                where: { id: id },
                                                data: { deletedAt: itx.createdAt, deleteReason: reason },
                                            })];
                                        case 4:
                                            _a.sent();
                                            return [4 /*yield*/, messageQueue.updateDelay("muteEnd", mute.id.toString(), 0)];
                                        case 5:
                                            _a.sent();
                                            log.push("muteRemove", itx.guild, {
                                                mute: mute,
                                                moderator: itx.user,
                                                removeReason: reason,
                                            });
                                            return [2 /*return*/, mute];
                                    }
                                });
                            }); })];
                    case 2:
                        mute = _e.sent();
                        if (!mute)
                            return [2 /*return*/];
                        if (!reason) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.editReply("Usuni\u0119to wyciszenie ".concat((0, discord_js_1.inlineCode)(id.toString()), ". Pow\u00F3d usuni\u0119cia: ").concat((0, discord_js_1.italic)(reason)))];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        itx.editReply("Usuni\u0119to wyciszenie ".concat((0, discord_js_1.inlineCode)(id.toString())));
                        _e.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edit", function (command) {
        return command
            .setDescription("Edytuj wyciszenie")
            .addInteger("id", function (id) { return id.setDescription("ID wyciszenia").setMinValue(0); })
            .addString("reason", function (reason) {
            return reason.setDescription("Nowy powód wyciszenia").setRequired(false);
        })
            .addString("duration", function (duration) {
            return duration.setDescription("Nowy czas trwania wyciszenia").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var duration, result, _e, updatedMute, hasOriginalEnded, originalReason, originalDuration, content;
            var prisma = _c.prisma, messageQueue = _c.messageQueue, log = _c.moderationLog;
            var id = _d.id, reason = _d.reason, rawDuration = _d.duration;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _f.sent();
                        if (!(!reason && !rawDuration)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podaj nowy powód lub czas trwania wyciszenia")];
                    case 2:
                        _f.sent();
                        return [2 /*return*/];
                    case 3:
                        duration = rawDuration ? (0, duration_1.parseDuration)(rawDuration) : undefined;
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var mute, originalReason, hasOriginalEnded, originalDuration, updates, updatedMute;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getMute(tx, id, itx.guildId)];
                                        case 1:
                                            mute = _a.sent();
                                            if (!mute)
                                                return [2 /*return*/, { type: "error", reason: "mute-not-found" }];
                                            originalReason = mute.reason;
                                            hasOriginalEnded = mute.endsAt <= itx.createdAt;
                                            originalDuration = (0, date_fns_1.intervalToDuration)({
                                                start: mute.createdAt,
                                                end: mute.endsAt,
                                            });
                                            if (duration === null) {
                                                return [2 /*return*/, { type: "error", reason: "invalid-duration" }];
                                            }
                                            if (duration && (0, duration_1.durationToSeconds)(duration) === 0) {
                                                return [2 /*return*/, { type: "error", reason: "zero-duration" }];
                                            }
                                            updates = {};
                                            if (reason)
                                                updates.reason = reason;
                                            if (duration)
                                                updates.endsAt = (0, date_fns_1.add)(mute.createdAt, duration);
                                            return [4 /*yield*/, prisma.mute.update({
                                                    where: { id: id },
                                                    data: updates,
                                                })];
                                        case 2:
                                            updatedMute = _a.sent();
                                            return [2 /*return*/, {
                                                    type: "ok",
                                                    updatedMute: updatedMute,
                                                    hasOriginalEnded: hasOriginalEnded,
                                                    originalReason: originalReason,
                                                    originalDuration: originalDuration,
                                                }];
                                    }
                                });
                            }); })];
                    case 4:
                        result = _f.sent();
                        if (!(result.type === "error")) return [3 /*break*/, 11];
                        _e = result.reason;
                        switch (_e) {
                            case "mute-not-found": return [3 /*break*/, 5];
                            case "invalid-duration": return [3 /*break*/, 7];
                            case "zero-duration": return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 11];
                    case 5: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono wyciszenia o podanym ID")];
                    case 6: return [2 /*return*/, _f.sent()];
                    case 7: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`")];
                    case 8: return [2 /*return*/, _f.sent()];
                    case 9: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie można ustawić czasu trwania wyciszenia na 0")];
                    case 10: return [2 /*return*/, _f.sent()];
                    case 11:
                        updatedMute = result.updatedMute, hasOriginalEnded = result.hasOriginalEnded, originalReason = result.originalReason, originalDuration = result.originalDuration;
                        if (!duration) return [3 /*break*/, 13];
                        return [4 /*yield*/, messageQueue.updateDelay("muteEnd", updatedMute.id.toString(), (0, duration_1.durationToSeconds)(duration))];
                    case 12:
                        _f.sent();
                        _f.label = 13;
                    case 13:
                        log.push("muteEdit", itx.guild, {
                            mute: updatedMute,
                            moderator: itx.user,
                            oldReason: originalReason,
                            newReason: reason,
                            oldDuration: originalDuration,
                            newDuration: duration !== null && duration !== void 0 ? duration : null,
                        });
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                var member, content;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, itx.guild.members.fetch(updatedMute.userId)];
                                        case 1:
                                            member = _a.sent();
                                            content = "Twoje wyciszenie zosta\u0142o zedytowane przez ".concat((0, discord_js_1.userMention)(itx.user.id), " (").concat(itx.user.tag, ").");
                                            if (reason) {
                                                content += "\n\nPoprzedni pow\u00F3d wyciszenia: ".concat((0, discord_js_1.italic)(originalReason), "\nNowy pow\u00F3d wyciszenia: ").concat((0, discord_js_1.italic)(reason));
                                            }
                                            if (duration) {
                                                content += "\n\nPoprzednia d\u0142ugo\u015B\u0107 kary: ".concat((0, discord_js_1.bold)((0, duration_1.formatDuration)(originalDuration)), "\nNowa d\u0142ugo\u015B\u0107 kary: ").concat((0, discord_js_1.bold)((0, duration_1.formatDuration)(duration)));
                                            }
                                            if (hasOriginalEnded) {
                                                content += "\nTwoje wyciszenie zako\u0144czy\u0142o si\u0119 ".concat((0, discord_js_1.time)(updatedMute.endsAt, discord_js_1.TimestampStyles.RelativeTime), ", wi\u0119c te zmiany nie wp\u0142yn\u0105 na d\u0142ugo\u015B\u0107 Twojego wyciszenia.");
                                            }
                                            return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member.user, content)];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], es_toolkit_1.noop)];
                    case 14:
                        _f.sent();
                        content = [
                            "Zaktualizowano wyciszenie ".concat((0, discord_js_1.inlineCode)(updatedMute.id.toString()), "."),
                        ];
                        if (reason)
                            content.push("Nowy pow\u00F3d: ".concat((0, discord_js_1.italic)(reason)));
                        if (rawDuration) {
                            content.push("Koniec: ".concat((0, discord_js_1.time)(updatedMute.endsAt, discord_js_1.TimestampStyles.RelativeTime)));
                        }
                        if (hasOriginalEnded) {
                            content.push("To wyciszenie ju\u017C si\u0119 zako\u0144czy\u0142o ".concat((0, discord_js_1.time)(updatedMute.endsAt, discord_js_1.TimestampStyles.RelativeTime), ", wi\u0119c te zmiany nie wp\u0142yn\u0105 na d\u0142ugo\u015B\u0107 wyciszenia."));
                        }
                        return [4 /*yield*/, itx.editReply(content.join("\n"))];
                    case 15:
                        _f.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .group("mutes", function (group) {
    return group
        .setDescription("Sprawdzaj aktywne wyciszenia i historię wyciszeń")
        .setDMPermission(false)
        .addCommand("list", function (command) {
        return command
            .setDescription("Wyświetl wszystkie aktywne wyciszenia")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginate, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!itx.memberPermissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers))
                            return [2 /*return*/];
                        where = {
                            guildId: itx.guildId,
                            deletedAt: null,
                            endsAt: { gte: itx.createdAt },
                        };
                        paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.mute.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.mute.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        paginatedView = new core_1.PaginatedView(paginate, "Aktywne wyciszenia", function (mute) {
                            var lines = [
                                (0, discord_js_1.heading)("".concat((0, discord_js_1.userMention)(mute.userId), " ").concat((0, discord_js_1.time)(mute.createdAt, discord_js_1.TimestampStyles.ShortDateTime), " [").concat(mute.id, "]"), discord_js_1.HeadingLevel.Three),
                                "".concat((0, discord_js_1.bold)("Moderator"), ": ").concat((0, discord_js_1.userMention)(mute.moderatorId)),
                                "".concat((0, discord_js_1.bold)("Koniec"), ": ").concat((0, discord_js_1.time)(mute.endsAt, discord_js_1.TimestampStyles.RelativeTime)),
                                "".concat((0, discord_js_1.bold)("Powód"), ": ").concat((0, discord_js_1.italic)(mute.reason)),
                            ];
                            return lines.join("\n");
                        }, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("user", function (command) {
        return command
            .setDescription("Wyświetl wyciszenia użytkownika")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addBoolean("deleted", function (deleted) {
            return deleted.setDescription("Pokaż usunięte wyciszenia").setRequired(false);
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
                        paginatedView = getUserMutesPaginatedView(prisma, user, itx.guildId, deleted);
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
            .setDescription("Wyświetl swoje wyciszenia")
            .addBoolean("deleted", function (deleted) {
            return deleted.setDescription("Pokaż usunięte wyciszenia").setRequired(false);
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
                        paginatedView = getUserMutesPaginatedView(prisma, itx.user, itx.guildId, deleted);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("guildMemberAdd", function (_a, member_1) { return __awaiter(void 0, [_a, member_1], void 0, function (_b, member) {
    var activeMute, guildRoles;
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.mute.findFirst({
                    where: {
                        guildId: member.guild.id,
                        userId: member.id,
                        deletedAt: null,
                        endsAt: { gte: new Date() },
                    },
                })];
            case 1:
                activeMute = _c.sent();
                if (!activeMute)
                    return [2 /*return*/];
                return [4 /*yield*/, (0, util_1.getGuildRolesIds)(prisma, member.guild.id)];
            case 2:
                guildRoles = _c.sent();
                if (!guildRoles.muteRoleId)
                    return [2 /*return*/];
                return [4 /*yield*/, (0, util_1.applyMute)(member, guildRoles.muteRoleId, "Przywr\u00F3cone wyciszenie [".concat(activeMute.id, "]"))];
            case 3:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); })
    .userContextMenu("mute", discord_js_1.PermissionFlagsBits.ModerateMembers, function (_a, itx_1) { return __awaiter(void 0, [_a, itx_1], void 0, function (_b, itx) {
    var prisma = _b.prisma, messageQueue = _b.messageQueue, log = _b.moderationLog;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleContextMenu({
                        prisma: prisma,
                        messageQueue: messageQueue,
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
    .messageContextMenu("mute", discord_js_1.PermissionFlagsBits.ModerateMembers, function (_a, itx_1) { return __awaiter(void 0, [_a, itx_1], void 0, function (_b, itx) {
    var prisma = _b.prisma, messageQueue = _b.messageQueue, log = _b.moderationLog;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleContextMenu({
                        prisma: prisma,
                        messageQueue: messageQueue,
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
