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
exports.moderatorLeave = void 0;
var tz_1 = require("@date-fns/tz");
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var specializedConstants_1 = require("./specializedConstants");
var dateParsing_1 = require("./util/dateParsing");
var ensureUsersExist_1 = require("./util/ensureUsersExist");
var errorFollowUp_1 = require("./util/errorFollowUp");
var fetchMembers_1 = require("./util/fetchMembers");
exports.moderatorLeave = new core_1.Hashira({ name: "moderator-leave" })
    .use(base_1.base)
    .group("urlop", function (group) {
    return group
        .setDescription("Zarządzanie urlopami moderatorów")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
        .setDMPermission(false)
        .addCommand("dodaj", function (command) {
        return command
            .setDescription("Dodaj urlop")
            .addUser("user", function (user) { return user.setDescription("Moderator"); })
            .addString("start", function (start) {
            return start.setDescription("Początek urlopu, np. 05-15, 2025-05-15, today");
        })
            .addString("koniec", function (end) {
            return end.setDescription("Koniec urlopu, np. 05-20, 2025-05-20, tomorrow");
        })
            .addBoolean("dodaj-role", function (addRole) {
            return addRole.setDescription("Czy dodać rolę urlopową moderatorowi");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var parsedStart, parsedEnd, startsAt, endsAt, overlappingLeave, leave;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var user = _d.user, rawStart = _d.start, rawEnd = _d.koniec, addRole = _d["dodaj-role"];
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        parsedStart = (0, dateParsing_1.parseDate)(rawStart, "start", null);
                        if (!parsedStart) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowa data początku urlopu. Podaj datę w formacie RRRR-MM-DD (bez godziny)")];
                        }
                        parsedEnd = (0, dateParsing_1.parseDate)(rawEnd, "end", null);
                        if (!parsedEnd) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowa data końca urlopu. Podaj datę w formacie RRRR-MM-DD (bez godziny)")];
                        }
                        startsAt = (0, date_fns_1.startOfDay)(new tz_1.TZDate(parsedStart, specializedConstants_1.TZ));
                        endsAt = (0, date_fns_1.endOfDay)(new tz_1.TZDate(parsedEnd, specializedConstants_1.TZ));
                        if (endsAt <= startsAt) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Koniec urlopu musi być po jego początku")];
                        }
                        return [4 /*yield*/, prisma.moderatorLeave.findFirst({
                                where: {
                                    guildId: itx.guildId,
                                    userId: user.id,
                                    deletedAt: null,
                                    OR: [
                                        {
                                            startsAt: { lte: endsAt },
                                            endsAt: { gte: startsAt },
                                        },
                                        {
                                            startsAt: { lte: startsAt },
                                            endsAt: { gte: endsAt },
                                        },
                                    ],
                                },
                            })];
                    case 2:
                        overlappingLeave = _e.sent();
                        if (overlappingLeave) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ten moderator ma aktywny lub zaplanowany urlop w tym zakresie czasowym")];
                        }
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, user.id)];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, prisma.moderatorLeave.create({
                                data: {
                                    guildId: itx.guildId,
                                    userId: user.id,
                                    startsAt: startsAt,
                                    endsAt: endsAt,
                                    addRole: addRole,
                                },
                            })];
                    case 4:
                        leave = _e.sent();
                        return [4 /*yield*/, messageQueue.push("moderatorLeaveStart", { leaveId: leave.id, userId: user.id, guildId: itx.guildId }, startsAt, leave.id.toString())];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, messageQueue.push("moderatorLeaveEnd", { leaveId: leave.id, userId: user.id, guildId: itx.guildId }, endsAt, leave.id.toString())];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Dodano urlop dla ".concat((0, discord_js_1.userMention)(user.id), " od ").concat((0, discord_js_1.time)(startsAt, discord_js_1.TimestampStyles.LongDate), " do ").concat((0, discord_js_1.time)(endsAt, discord_js_1.TimestampStyles.LongDate)))];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("usuń", function (command) {
        return command
            .setDescription("Usuń lub zakończ urlop")
            .addNumber("urlop", function (id) {
            return id.setDescription("Urlop do usunięcia").setAutocomplete(true);
        })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var results, userIds, members, dateFormat;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.moderatorLeave.findMany({
                                where: {
                                    guildId: itx.guild.id,
                                    deletedAt: null,
                                    endsAt: { gt: itx.createdAt },
                                },
                            })];
                    case 1:
                        results = _c.sent();
                        userIds = results.map(function (r) { return r.userId; });
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, userIds)];
                    case 2:
                        members = _c.sent();
                        dateFormat = "yyyy-MM-dd";
                        return [4 /*yield*/, itx.respond(results.map(function (r) {
                                var _a, _b;
                                return ({
                                    value: r.id,
                                    name: "".concat((_b = (_a = members.get(r.userId)) === null || _a === void 0 ? void 0 : _a.user.tag) !== null && _b !== void 0 ? _b : r.userId, " ").concat((0, date_fns_1.formatDate)(r.startsAt, dateFormat), " - ").concat((0, date_fns_1.formatDate)(r.endsAt, dateFormat)),
                                });
                            }))];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var leave, confirmation;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var leaveId = _d.urlop;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.moderatorLeave.findFirst({
                                where: { id: leaveId, guildId: itx.guildId },
                            })];
                    case 2:
                        leave = _e.sent();
                        if (!!leave) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono urlopu o podanym ID")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4: return [4 /*yield*/, (0, core_1.waitForConfirmation)({ send: itx.editReply.bind(itx) }, "Czy na pewno chcesz usun\u0105\u0107 urlop ".concat((0, discord_js_1.userMention)(leave.userId), "?"), "Tak", "Nie", function (action) { return action.user.id === itx.user.id; })];
                    case 5:
                        confirmation = _e.sent();
                        if (!!confirmation) return [3 /*break*/, 7];
                        errorFollowUp_1.errorFollowUp;
                        return [4 /*yield*/, itx.editReply({
                                content: "Anulowano usunięcie urlopu",
                                components: [],
                            })];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                    case 7: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tx.moderatorLeave.update({
                                            where: { id: leaveId },
                                            data: { deletedAt: itx.createdAt },
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, messageQueue.cancelTx(tx, "moderatorLeaveStart", leaveId.toString())];
                                    case 2:
                                        _a.sent();
                                        if (!(leave.startsAt < itx.createdAt && itx.createdAt < leave.endsAt)) return [3 /*break*/, 4];
                                        // End the leave now if it was already in progress
                                        return [4 /*yield*/, messageQueue.updateDelayTx(tx, "moderatorLeaveEnd", leaveId.toString(), itx.createdAt)];
                                    case 3:
                                        // End the leave now if it was already in progress
                                        _a.sent();
                                        return [3 /*break*/, 6];
                                    case 4: return [4 /*yield*/, messageQueue.cancelTx(tx, "moderatorLeaveEnd", leaveId.toString())];
                                    case 5:
                                        _a.sent();
                                        _a.label = 6;
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 8:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Usuni\u0119to urlop ".concat((0, discord_js_1.userMention)(leave.userId), " ").concat((0, discord_js_1.time)(leave.startsAt, discord_js_1.TimestampStyles.ShortDateTime), " - ").concat((0, discord_js_1.time)(leave.endsAt, discord_js_1.TimestampStyles.ShortDateTime), " [").concat(leave.id, "]"),
                                components: [],
                            })];
                    case 9:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("lista", function (command) {
        return command.setDescription("Lista urlopów").handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginate, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = {
                            guildId: itx.guildId,
                            endsAt: { gt: itx.createdAt },
                            deletedAt: null,
                        };
                        paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.moderatorLeave.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.moderatorLeave.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        paginatedView = new core_1.PaginatedView(paginate, "Urlopy moderatorów", function (leave) {
                            var lines = [
                                (0, discord_js_1.heading)((0, discord_js_1.userMention)(leave.userId), discord_js_1.HeadingLevel.Two),
                                "".concat((0, discord_js_1.bold)("Start"), ": ").concat((0, discord_js_1.time)(leave.startsAt, discord_js_1.TimestampStyles.ShortDateTime)),
                                "".concat((0, discord_js_1.bold)("Koniec"), ": ").concat((0, discord_js_1.time)(leave.endsAt, discord_js_1.TimestampStyles.ShortDateTime)),
                            ];
                            return lines.join("\n");
                        }, false);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
