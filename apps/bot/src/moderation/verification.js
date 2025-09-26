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
exports.verification = exports.formatVerificationType = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var specializedConstants_1 = require("../specializedConstants");
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var util_1 = require("./util");
var get16PlusVerificationEnd = function (createdAt) {
    return (0, date_fns_1.addSeconds)(createdAt, specializedConstants_1.STRATA_CZASU.VERIFICATION_DURATION);
};
var satisfiesVerificationLevel = function (level, target) {
    if (level === null)
        return false;
    var levels = { plus13: 0, plus16: 1, plus18: 2 };
    return levels[level] >= levels[target];
};
var formatVerificationType = function (type) {
    switch (type) {
        case "plus13":
            return "13+";
        case "plus16":
            return "16+";
        case "plus18":
            return "18+";
        default:
            return "Brak";
    }
};
exports.formatVerificationType = formatVerificationType;
var getActive16PlusVerification = function (prisma, guildId, userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, prisma.verification.findFirst({
                where: { guildId: guildId, userId: userId, type: "plus16", status: "in_progress" },
            })];
    });
}); };
var readMember = function (itx, user) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, itx.guild.members.fetch(user.id)];
            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, null];
            }); }); })];
    });
}); };
var acceptVerification = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var dbUser, currentVerificationLevel, active16PlusVerification, activeMute, guildRoles, muteRoleId_1, reason_1, plus18RoleId_1, reason_2;
    var prisma = _b.prisma, messageQueue = _b.messageQueue, guild = _b.guild, member = _b.member, moderator = _b.moderator, verificationType = _b.verificationType, acceptedAt = _b.acceptedAt;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.user.findFirst({ where: { id: member.id } })];
            case 1:
                dbUser = _c.sent();
                if (!dbUser) {
                    return [2 /*return*/, { success: false, error: "user_not_found" }];
                }
                if (satisfiesVerificationLevel(dbUser.verificationLevel, verificationType)) {
                    return [2 /*return*/, { success: false, error: "already_verified" }];
                }
                currentVerificationLevel = dbUser.verificationLevel;
                return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var active16PlusVerification;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, getActive16PlusVerification(tx, guild.id, member.id)];
                                case 1:
                                    active16PlusVerification = _a.sent();
                                    if (!active16PlusVerification) return [3 /*break*/, 5];
                                    return [4 /*yield*/, tx.verification.update({
                                            where: { id: active16PlusVerification.id },
                                            data: { status: "accepted", acceptedAt: acceptedAt },
                                        })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, messageQueue.cancelTx(tx, "verificationEnd", active16PlusVerification.id.toString())];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, (0, util_1.cancelVerificationReminders)(tx, messageQueue, active16PlusVerification.id)];
                                case 4:
                                    _a.sent();
                                    return [3 /*break*/, 7];
                                case 5: return [4 /*yield*/, tx.verification.create({
                                        data: {
                                            guildId: guild.id,
                                            userId: member.id,
                                            moderatorId: moderator.id,
                                            type: verificationType,
                                            status: "accepted",
                                            acceptedAt: acceptedAt,
                                        },
                                    })];
                                case 6:
                                    _a.sent();
                                    _a.label = 7;
                                case 7: return [4 /*yield*/, tx.user.update({
                                        where: { id: member.id },
                                        data: { verificationLevel: verificationType },
                                    })];
                                case 8:
                                    _a.sent();
                                    return [2 /*return*/, {
                                            hasActiveVerification: active16PlusVerification !== null,
                                        }];
                            }
                        });
                    }); })];
            case 2:
                active16PlusVerification = _c.sent();
                return [4 /*yield*/, prisma.mute.findFirst({
                        where: {
                            guildId: guild.id,
                            userId: member.id,
                            endsAt: { gte: acceptedAt },
                            deletedAt: null,
                        },
                    })];
            case 3:
                activeMute = _c.sent();
                return [4 /*yield*/, (0, util_1.getGuildRolesIds)(prisma, guild.id)];
            case 4:
                guildRoles = _c.sent();
                if (!(!activeMute && active16PlusVerification)) return [3 /*break*/, 6];
                if (!guildRoles.muteRoleId) return [3 /*break*/, 6];
                muteRoleId_1 = guildRoles.muteRoleId;
                reason_1 = "Weryfikacja przyj\u0119ta (".concat(verificationType, "), moderator: ").concat(moderator.id, ")");
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return member.roles.remove(muteRoleId_1, reason_1); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions, discord_js_1.RESTJSONErrorCodes.UnknownMember], function () {
                        return moderator.send("Nie uda\u0142o si\u0119 zdj\u0105\u0107 roli wyciszenia z ".concat(member.user.tag, " po weryfikacji"));
                    })];
            case 5:
                _c.sent();
                _c.label = 6;
            case 6:
                if (!(verificationType === "plus18")) return [3 /*break*/, 8];
                if (!guildRoles.plus18RoleId) return [3 /*break*/, 8];
                plus18RoleId_1 = guildRoles.plus18RoleId;
                reason_2 = "Weryfikacja 18+ przyj\u0119ta przez ".concat(moderator.user.tag, " (").concat(moderator.id, ")");
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return member.roles.add(plus18RoleId_1, reason_2); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions, discord_js_1.RESTJSONErrorCodes.UnknownMember], function () {
                        return moderator.send("Nie uda\u0142o si\u0119 doda\u0107 roli 18+ do ".concat(member.user.tag, " po weryfikacji"));
                    })];
            case 7:
                _c.sent();
                _c.label = 8;
            case 8: return [2 /*return*/, {
                    success: true,
                    hadActiveVerification: active16PlusVerification.hasActiveVerification,
                    currentVerificationLevel: currentVerificationLevel,
                    shouldRemoveMute: !activeMute && active16PlusVerification.hasActiveVerification,
                }];
        }
    });
}); };
var composeSuccessMessage = function (user, verificationType, _a) {
    var shouldRemoveMute = _a.shouldRemoveMute;
    var parts = [
        "Hej ".concat((0, discord_js_1.userMention)(user.id), "! Przed chwil\u0105 **Twoja weryfikacja wieku zosta\u0142a pozytywnie rozpatrzona**."),
    ];
    if (shouldRemoveMute) {
        parts.push("Twój mute został usunięty.");
    }
    parts.push("Od teraz b\u0119dziemy jako administracja wiedzie\u0107, \u017Ce masz uko\u0144czone ".concat(verificationType === "plus16" ? "16" : "18", " lat i nie b\u0119dziemy Ci\u0119 w przysz\u0142o\u015Bci weryfikowa\u0107 ponownie."));
    if (verificationType === "plus18") {
        parts.push("Z uwagi na Twój wiek dałem Ci też rolę `18+` dzięki której uzyskałeś dostęp do kilku dodatkowych kanałów na serwerze, m.in do `#rozmowy-niesforne`.");
    }
    parts.push("Miłego dnia!");
    return parts.join(" ");
};
exports.verification = new core_1.Hashira({ name: "verification" })
    .use(base_1.base)
    .group("weryfikacja", function (group) {
    return group
        .setDescription("Weryfikacja użytkowników")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("rozpocznij", function (command) {
        return command
            .setDescription("Rozpocznij weryfikację 16+")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            // TODO)) Add `force` parameter to start verification even if the user has a verification level
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var member, dbUser, verificationInProgress, guildRoles, appliedMute, verification, sentMessage;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var user = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, readMember(itx, user)];
                    case 2:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono użytkownika na serwerze")];
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [member, itx.user])];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, prisma.user.findFirst({ where: { id: member.id } })];
                    case 4:
                        dbUser = _e.sent();
                        if (!dbUser)
                            return [2 /*return*/];
                        if (!satisfiesVerificationLevel(dbUser.verificationLevel, "plus16")) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "".concat((0, discord_js_1.userMention)(member.id), " ma ju\u017C weryfikacj\u0119 ").concat((0, exports.formatVerificationType)(dbUser.verificationLevel)))];
                    case 5: return [2 /*return*/, _e.sent()];
                    case 6: return [4 /*yield*/, getActive16PlusVerification(prisma, itx.guildId, member.id)];
                    case 7:
                        verificationInProgress = _e.sent();
                        if (!verificationInProgress) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "".concat((0, discord_js_1.userMention)(member.id), " jest ju\u017C w trakcie weryfikacji przez ").concat((0, discord_js_1.userMention)(verificationInProgress.moderatorId), "\nData rozpocz\u0119cia: ").concat((0, discord_js_1.time)(verificationInProgress.createdAt, discord_js_1.TimestampStyles.ShortDateTime), "\nKoniec: ").concat((0, discord_js_1.time)(get16PlusVerificationEnd(verificationInProgress.createdAt), discord_js_1.TimestampStyles.RelativeTime)))];
                    case 8: return [2 /*return*/, _e.sent()];
                    case 9: return [4 /*yield*/, (0, util_1.getGuildRolesIds)(prisma, itx.guildId)];
                    case 10:
                        guildRoles = _e.sent();
                        if (!!guildRoles.muteRoleId) return [3 /*break*/, 12];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`")];
                    case 11:
                        _e.sent();
                        return [2 /*return*/];
                    case 12: return [4 /*yield*/, (0, util_1.applyMute)(member, guildRoles.muteRoleId, "Weryfikacja 16+, moderator: ".concat(itx.user.tag, " (").concat(itx.user.id, ")"))];
                    case 13:
                        appliedMute = _e.sent();
                        if (!!appliedMute) return [3 /*break*/, 15];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.")];
                    case 14:
                        _e.sent();
                        return [2 /*return*/];
                    case 15: return [4 /*yield*/, prisma.verification.create({
                            data: {
                                guildId: itx.guildId,
                                userId: member.id,
                                moderatorId: itx.user.id,
                                type: "plus16",
                                status: "in_progress",
                            },
                        })];
                    case 16:
                        verification = _e.sent();
                        return [4 /*yield*/, messageQueue.push("verificationEnd", { verificationId: verification.id }, specializedConstants_1.STRATA_CZASU.VERIFICATION_DURATION, verification.id.toString())];
                    case 17:
                        _e.sent();
                        return [4 /*yield*/, (0, util_1.scheduleVerificationReminders)(messageQueue, verification.id)];
                    case 18:
                        _e.sent();
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(member, "Hejka ".concat((0, discord_js_1.userMention)(member.id), "! Na podstawie Twojego zachowania na serwerze lub kt\u00F3rej\u015B z Twoich wiadomo\u015Bci uznali\u015Bmy, \u017Ce **mo\u017Cesz mie\u0107 mniej ni\u017C 16 lat**. Dlatego przed chwil\u0105 jedna z os\u00F3b z administracji (").concat((0, discord_js_1.userMention)(itx.user.id), ") **rozpocz\u0119\u0142a weryfikacj\u0119 Twojego wieku**.\n\n**Masz teraz 72 godziny na otwarcie ticketa na kanale `#wyslij-ticket`: ").concat((0, discord_js_1.channelMention)(specializedConstants_1.STRATA_CZASU.TICKETS_CHANNEL_ID), "** (musisz klikn\u0105\u0107 przycisk \"Wiek\"). Po utworzeniu ticketa musisz przej\u015B\u0107 pozytywnie przez proces weryfikacji. Najcz\u0119\u015Bciej sprowadza si\u0119 to do wys\u0142ania jednego zdj\u0119cia. Instrukcje co masz wys\u0142a\u0107 znajdziesz w na kanale z linka. Brak weryfikacji w ci\u0105gu 72 godzin **zako\u0144czy si\u0119 banem**, dlatego prosz\u0119 nie ignoruj tej wiadomo\u015Bci. Pozdrawiam!"))];
                    case 19:
                        sentMessage = _e.sent();
                        return [4 /*yield*/, itx.editReply("Rozpocz\u0119to weryfikacj\u0119 16+ dla ".concat((0, discord_js_1.userMention)(member.id)))];
                    case 20:
                        _e.sent();
                        if (!!sentMessage) return [3 /*break*/, 22];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, util_1.formatUserWithId)(member), "."))];
                    case 21:
                        _e.sent();
                        _e.label = 22;
                    case 22: return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("lista", function (command) {
        return command
            .setDescription("Sprawdź aktywne weryfikacje")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginate, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = {
                            guildId: itx.guildId,
                            type: db_1.VerificationType.plus16,
                            status: db_1.VerificationStatus.in_progress,
                        };
                        paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.verification.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.verification.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        paginatedView = new core_1.PaginatedView(paginate, "Aktywne weryfikacje 16+", function (_a) {
                            var createdAt = _a.createdAt, userId = _a.userId, moderatorId = _a.moderatorId;
                            return "### ".concat((0, discord_js_1.userMention)(userId), " (").concat((0, discord_js_1.inlineCode)(userId), ")\nModerator: ").concat((0, discord_js_1.userMention)(moderatorId), "\nData rozpocz\u0119cia: ").concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.ShortDateTime), "\nKoniec: ").concat((0, discord_js_1.time)(get16PlusVerificationEnd(createdAt), discord_js_1.TimestampStyles.RelativeTime));
                        }, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("przyjmij", function (command) {
        return command
            .setDescription("Przyjmij weryfikację")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addString("type", function (type) {
            return type
                .setDescription("Typ weryfikacji")
                .addChoices({ name: "16+", value: db_1.VerificationLevel.plus16 }, { name: "18+", value: db_1.VerificationLevel.plus18 });
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var verificationType, member, result, content, sentMessage, messageSentContent;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var user = _d.user, rawType = _d.type;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        verificationType = rawType;
                        return [4 /*yield*/, readMember(itx, user)];
                    case 2:
                        member = _e.sent();
                        if (!!member) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie uda\u0142o si\u0119 znale\u017A\u0107 cz\u0142onka serwera dla ".concat((0, util_1.formatUserWithId)(user), "."))];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [user, itx.user])];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, acceptVerification({
                                prisma: prisma,
                                messageQueue: messageQueue,
                                guild: itx.guild,
                                member: member,
                                moderator: itx.member,
                                verificationType: verificationType,
                                acceptedAt: itx.createdAt,
                            })];
                    case 6:
                        result = _e.sent();
                        if (!!result.success) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie uda\u0142o si\u0119 przyj\u0105\u0107 weryfikacji ".concat((0, exports.formatVerificationType)(verificationType), " dla ").concat((0, discord_js_1.userMention)(user.id), ". Pow\u00F3d: ").concat((0, discord_js_1.inlineCode)(result.error)))];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                    case 8:
                        content = composeSuccessMessage(user, verificationType, result);
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, content)];
                    case 9:
                        sentMessage = _e.sent();
                        messageSentContent = sentMessage
                            ? ""
                            : "Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, util_1.formatUserWithId)(user), ".");
                        return [4 /*yield*/, itx.editReply("Przyj\u0119to weryfikacj\u0119 ".concat((0, exports.formatVerificationType)(verificationType), " dla ").concat((0, discord_js_1.userMention)(user.id), ". ").concat(messageSentContent))];
                    case 10:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("odrzuc", function (command) {
        return command
            .setDescription("Odrzuć weryfikację 16+")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var dbUser, verificationInProgress, verificationUpdated, sentMessage, banned;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var user = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [user, itx.user])];
                    case 2:
                        _e.sent();
                        return [4 /*yield*/, prisma.user.findFirst({ where: { id: user.id } })];
                    case 3:
                        dbUser = _e.sent();
                        if (!dbUser)
                            return [2 /*return*/];
                        return [4 /*yield*/, getActive16PlusVerification(prisma, itx.guildId, user.id)];
                    case 4:
                        verificationInProgress = _e.sent();
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var newVerification;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!verificationInProgress) return [3 /*break*/, 4];
                                            return [4 /*yield*/, tx.verification.update({
                                                    where: { id: verificationInProgress.id },
                                                    data: { status: "rejected", rejectedAt: itx.createdAt },
                                                })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, messageQueue.cancelTx(tx, "verificationEnd", verificationInProgress.id.toString())];
                                        case 2:
                                            _a.sent();
                                            return [4 /*yield*/, (0, util_1.cancelVerificationReminders)(tx, messageQueue, verificationInProgress.id)];
                                        case 3:
                                            _a.sent();
                                            return [2 /*return*/, verificationInProgress.id];
                                        case 4: return [4 /*yield*/, tx.verification.create({
                                                data: {
                                                    createdAt: itx.createdAt,
                                                    rejectedAt: itx.createdAt,
                                                    guildId: itx.guildId,
                                                    userId: user.id,
                                                    moderatorId: itx.user.id,
                                                    type: "plus16",
                                                    status: "rejected",
                                                },
                                            })];
                                        case 5:
                                            newVerification = _a.sent();
                                            return [2 /*return*/, newVerification.id];
                                    }
                                });
                            }); })];
                    case 5:
                        verificationUpdated = _e.sent();
                        return [4 /*yield*/, (0, util_1.sendVerificationFailedMessage)(user)];
                    case 6:
                        sentMessage = _e.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                var reason;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            reason = (0, util_1.formatBanReason)("Nieudana weryfikacja 16+ [".concat(verificationUpdated, "]"), itx.user, itx.createdAt);
                                            return [4 /*yield*/, itx.guild.bans.create(user, { reason: reason })];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, true];
                                    }
                                });
                            }); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return false; })];
                    case 7:
                        banned = _e.sent();
                        return [4 /*yield*/, itx.editReply("Odrzucono weryfikacj\u0119 16+ dla ".concat((0, discord_js_1.userMention)(user.id)))];
                    case 8:
                        _e.sent();
                        if (!!sentMessage) return [3 /*break*/, 10];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, util_1.formatUserWithId)(user), "."))];
                    case 9:
                        _e.sent();
                        _e.label = 10;
                    case 10:
                        if (!!banned) return [3 /*break*/, 12];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie uda\u0142o si\u0119 zbanowa\u0107 ".concat((0, util_1.formatUserWithId)(user)))];
                    case 11:
                        _e.sent();
                        _e.label = 12;
                    case 12: return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("wycofaj", function (command) {
        return command
            .setDescription("Wycofaj weryfikację, jeśli przypadkowo została rozpoczęta")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var member, result;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var user = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, readMember(itx, user)];
                    case 2:
                        member = _e.sent();
                        if (!member)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono użytkownika na serwerze")];
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [member, itx.user])];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var verificationInProgress, guildRoles;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getActive16PlusVerification(tx, itx.guildId, member.id)];
                                        case 1:
                                            verificationInProgress = _a.sent();
                                            if (!verificationInProgress)
                                                return [2 /*return*/, { status: "not_in_progress" }];
                                            return [4 /*yield*/, prisma.verification.update({
                                                    where: { id: verificationInProgress.id },
                                                    data: { status: "cancelled", cancelledAt: itx.createdAt },
                                                })];
                                        case 2:
                                            _a.sent();
                                            return [4 /*yield*/, messageQueue.cancelTx(tx, "verificationEnd", verificationInProgress.id.toString())];
                                        case 3:
                                            _a.sent();
                                            return [4 /*yield*/, (0, util_1.getGuildRolesIds)(prisma, itx.guildId)];
                                        case 4:
                                            guildRoles = _a.sent();
                                            if (!guildRoles.muteRoleId)
                                                return [2 /*return*/, { status: "mute_role_not_set" }];
                                            return [2 /*return*/, { status: "success", muteRoleId: guildRoles.muteRoleId }];
                                    }
                                });
                            }); })];
                    case 4:
                        result = _e.sent();
                        if (result.status === "not_in_progress") {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "".concat((0, discord_js_1.userMention)(member.id), " nie jest w trakcie weryfikacji 16+"))];
                        }
                        if (result.status === "mute_role_not_set") {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`")];
                        }
                        return [4 /*yield*/, (0, util_1.removeMute)(member, result.muteRoleId, "Wycofanie weryfikacji 16+")];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Wycofano weryfikacj\u0119 16+ dla ".concat((0, discord_js_1.userMention)(member.id)))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .command("weryfikacja-ok", function (command) {
    return command
        .setDefaultMemberPermissions(0)
        .setDescription("Potwierdź weryfikację dla osób 18+")
        .addUser("user", function (user) {
        return user.setDescription("Użytkownik, którego weryfikacja ma zostać przyjęta");
    })
        .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
        var member, result, content, sentMessage, messageSentContent;
        var prisma = _c.prisma, messageQueue = _c.messageQueue;
        var user = _d.user;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, readMember(itx, user)];
                case 2:
                    member = _e.sent();
                    if (!member) {
                        return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono użytkownika na serwerze")];
                    }
                    return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [member, itx.user])];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, acceptVerification({
                            prisma: prisma,
                            messageQueue: messageQueue,
                            guild: itx.guild,
                            member: member,
                            moderator: itx.member,
                            verificationType: "plus18",
                            acceptedAt: itx.createdAt,
                        })];
                case 4:
                    result = _e.sent();
                    if (!result.success) {
                        return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie uda\u0142o si\u0119 potwierdzi\u0107 weryfikacji 18+ dla ".concat((0, discord_js_1.userMention)(member.id), ", ").concat((0, discord_js_1.inlineCode)(result.error)))];
                    }
                    content = composeSuccessMessage(user, "plus18", result);
                    return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, content)];
                case 5:
                    sentMessage = _e.sent();
                    messageSentContent = sentMessage
                        ? ""
                        : "Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, util_1.formatUserWithId)(user), ".");
                    return [4 /*yield*/, itx.editReply("Przyj\u0119to weryfikacj\u0119 ".concat((0, exports.formatVerificationType)("plus18"), " dla ").concat((0, discord_js_1.userMention)(user.id), ". ").concat(messageSentContent))];
                case 6:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .handle("guildMemberAdd", function (_a, member_1) { return __awaiter(void 0, [_a, member_1], void 0, function (_b, member) {
    var _c, muteRoleId, plus18RoleId, dbUser, verificationInProgress;
    var prisma = _b.prisma;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, (0, util_1.getGuildRolesIds)(prisma, member.guild.id)];
            case 1:
                _c = _d.sent(), muteRoleId = _c.muteRoleId, plus18RoleId = _c.plus18RoleId;
                return [4 /*yield*/, prisma.user.findFirst({ where: { id: member.user.id } })];
            case 2:
                dbUser = _d.sent();
                if (!(dbUser &&
                    satisfiesVerificationLevel(dbUser.verificationLevel, "plus18") &&
                    plus18RoleId)) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return member.roles.add(plus18RoleId, "Przywrócenie roli za weryfikację 18+"); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions, discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return console.warn("Couldn't restore 18+ role for user ".concat(member.user.id)); })];
            case 3:
                _d.sent();
                _d.label = 4;
            case 4: return [4 /*yield*/, getActive16PlusVerification(prisma, member.guild.id, member.id)];
            case 5:
                verificationInProgress = _d.sent();
                if (!(verificationInProgress && muteRoleId)) return [3 /*break*/, 7];
                return [4 /*yield*/, (0, util_1.applyMute)(member, muteRoleId, "Przywr\u00F3cone wyciszenie (weryfikacja 16+) [".concat(verificationInProgress.id, "]"))];
            case 6:
                _d.sent();
                _d.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); });
