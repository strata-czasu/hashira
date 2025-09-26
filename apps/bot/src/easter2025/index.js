"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.easter2025 = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var safeSendCode_1 = require("../util/safeSendCode");
var getTeamActivity = function (prisma, teamId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    SELECT\n      tm.\"userId\",\n      COUNT(*) AS activity_count\n    FROM \"Easter2025TeamMember\" tm\n    JOIN \"userTextActivity\" uta\n      ON uta.\"userId\"    = tm.\"userId\"\n        AND uta.\"timestamp\" >= tm.\"joinedAt\"\n        AND NOT EXISTS (\n          SELECT 1\n          FROM \"Easter2025DisabledChannels\" dc\n          WHERE dc.\"channelId\" = uta.\"channelId\"\n        )\n    WHERE\n      tm.\"teamId\" = ", "\n    GROUP BY\n      tm.\"userId\"\n    ORDER BY\n      activity_count DESC;\n    "], ["\n    SELECT\n      tm.\"userId\",\n      COUNT(*) AS activity_count\n    FROM \"Easter2025TeamMember\" tm\n    JOIN \"userTextActivity\" uta\n      ON uta.\"userId\"    = tm.\"userId\"\n        AND uta.\"timestamp\" >= tm.\"joinedAt\"\n        AND NOT EXISTS (\n          SELECT 1\n          FROM \"Easter2025DisabledChannels\" dc\n          WHERE dc.\"channelId\" = uta.\"channelId\"\n        )\n    WHERE\n      tm.\"teamId\" = ", "\n    GROUP BY\n      tm.\"userId\"\n    ORDER BY\n      activity_count DESC;\n    "])), teamId)];
    });
}); };
var getRandomTeam = function (prisma) { return __awaiter(void 0, void 0, void 0, function () {
    var existingTeams;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.easter2025Team.findMany()];
            case 1:
                existingTeams = _a.sent();
                return [2 /*return*/, (0, es_toolkit_1.sample)(existingTeams)];
        }
    });
}); };
var formatMilestoneProgress = function (totalPoints, currentMilestone, nextMilestone) {
    var _a;
    var neededPoints = (_a = nextMilestone === null || nextMilestone === void 0 ? void 0 : nextMilestone.neededPoints) !== null && _a !== void 0 ? _a : currentMilestone === null || currentMilestone === void 0 ? void 0 : currentMilestone.neededPoints;
    if ((0, es_toolkit_1.isNil)(neededPoints)) {
        return "Nie znaleziono progu!";
    }
    var progress = (Number(totalPoints) / neededPoints) * 100;
    var ending = Number.isNaN(progress) ? "" : " (".concat(progress.toFixed(1), "%)");
    return "".concat(totalPoints, "/").concat((0, discord_js_1.bold)(neededPoints.toString()), " wiadomo\u015Bci").concat(ending);
};
var updateMembership = function (prisma, member, teamId) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, existingMembership, teamMember;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, member)];
            case 1:
                _a.sent();
                userId = member.user.id;
                return [4 /*yield*/, prisma.easter2025TeamMember.findUnique({
                        where: { userId: userId },
                        select: { team: { select: { roleId: true } } },
                    })];
            case 2:
                existingMembership = _a.sent();
                return [4 /*yield*/, prisma.easter2025TeamMember.upsert({
                        where: { userId: userId },
                        update: { teamId: teamId },
                        create: { userId: userId, teamId: teamId },
                        select: { team: { select: { roleId: true } } },
                    })];
            case 3:
                teamMember = _a.sent();
                if (existingMembership) {
                    return [2 /*return*/, {
                            previousRoleId: existingMembership.team.roleId,
                            newRoleId: teamMember.team.roleId,
                        }];
                }
                return [2 /*return*/, { previousRoleId: null, newRoleId: teamMember.team.roleId }];
        }
    });
}); };
var getNextMilestone = function (prisma, teamId) {
    return prisma.easter2025Stage.findFirst({
        where: { teamId: teamId, completedAt: null },
        orderBy: { neededPoints: "asc" },
    });
};
var getCurrentMilestone = function (prisma, teamId) {
    return prisma.easter2025Stage.findFirst({
        where: { teamId: teamId, completedAt: { not: null } },
        orderBy: { neededPoints: "desc" },
    });
};
var getTeamEmbed = function (prisma, team) { return __awaiter(void 0, void 0, void 0, function () {
    var activities, totalActivity, _a, currentMilestone, nextMilestone, passedThreshold, embed, top10;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, getTeamActivity(prisma, team.id)];
            case 1:
                activities = _b.sent();
                totalActivity = activities.reduce(
                // biome-ignore lint/style/noNonNullAssertion: This is some quirk of Prisma
                function (sum, activity) { return sum + activity.activity_count; }, 0n);
                return [4 /*yield*/, prisma.$transaction([
                        getCurrentMilestone(prisma, team.id),
                        getNextMilestone(prisma, team.id),
                    ])];
            case 2:
                _a = _b.sent(), currentMilestone = _a[0], nextMilestone = _a[1];
                passedThreshold = nextMilestone && nextMilestone.neededPoints <= totalActivity;
                if (!passedThreshold) return [3 /*break*/, 4];
                // This will be updated in the next update
                return [4 /*yield*/, prisma.easter2025Stage.update({
                        where: {
                            teamId_neededPoints: {
                                teamId: team.id,
                                neededPoints: nextMilestone.neededPoints,
                            },
                        },
                        data: { completedAt: new Date() },
                    })];
            case 3:
                // This will be updated in the next update
                _b.sent();
                _b.label = 4;
            case 4:
                embed = new discord_js_1.EmbedBuilder()
                    .setTitle("Dru\u017Cyna: ".concat(team.name))
                    .setDescription("**Post\u0119p dru\u017Cyny:** ".concat(formatMilestoneProgress(totalActivity, currentMilestone, nextMilestone)))
                    .setColor(team.color);
                if (currentMilestone) {
                    embed.setImage(currentMilestone.linkedImageUrl);
                }
                top10 = (0, es_toolkit_1.take)(activities, 10).map(function (activity, index) {
                    return "".concat(index + 1, ". ").concat((0, discord_js_1.userMention)(activity.userId), ": ").concat(activity.activity_count, " wiadomo\u015Bci");
                });
                if (top10.length > 0) {
                    embed.addFields({
                        name: "Top 10 najbardziej aktywnych członków:",
                        value: top10.join("\n"),
                    });
                }
                return [2 /*return*/, { embed: embed, passedThreshold: passedThreshold }];
        }
    });
}); };
var isEventOpen = function (member) {
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers))
        return true;
    var eventStartDate = new Date("2025-04-17T12:00:00+02:00");
    return (0, date_fns_1.isAfter)(new Date(), eventStartDate);
};
exports.easter2025 = new core_1.Hashira({ name: "easter2025" })
    .use(base_1.base)
    .group("rozbij-jajco", function (group) {
    return group
        .setDescription("Event Wielkanocny 2025 - Rozbij jajco!")
        .addCommand("dolacz", function (command) {
        return command
            .setDescription("Dołącz do eventu Rozbij Jajco 2025")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var existingMembership, team, result;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!isEventOpen(itx.member))
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, prisma.easter2025TeamMember.findUnique({
                                where: { userId: itx.user.id },
                                select: { team: { select: { name: true } } },
                            })];
                    case 2:
                        existingMembership = _c.sent();
                        if (!existingMembership) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.editReply({
                                content: "Jeste\u015B ju\u017C cz\u0142onkiem dru\u017Cyny ".concat(existingMembership.team.name, "! Nie mo\u017Cesz do\u0142\u0105czy\u0107 ponownie."),
                            })];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, getRandomTeam(prisma)];
                    case 5:
                        team = _c.sent();
                        return [4 /*yield*/, updateMembership(prisma, itx.member, team.id)];
                    case 6:
                        result = _c.sent();
                        if (!result.previousRoleId) return [3 /*break*/, 8];
                        return [4 /*yield*/, itx.member.roles.remove(result.previousRoleId, "Zmieniono drużynę")];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8: return [4 /*yield*/, itx.member.roles.add(team.roleId, "Dołączenie do drużyny")];
                    case 9:
                        _c.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Witaj w dru\u017Cynie ".concat((0, discord_js_1.bold)(team.name), "! Od teraz Twoja aktywno\u015B\u0107 tekstowa liczy si\u0119 do og\u00F3lnej puli eventu Rozbij jajco!"),
                            })];
                    case 10:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("info", function (command) {
        return command
            .setDescription("Wyświetl informacje o evencie Rozbij Jajco 2025")
            .handle(function (_, __, itx) { return __awaiter(void 0, void 0, void 0, function () {
            var lines, embed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        lines = [
                            "Trwa event event wielkanocny! Dołącz do jednej z drużyn i rozbijajcie jajo razem!",
                            "Każda wiadomość wysłana na serwerze przez członka drużyny liczy się do ogólnego wyniku.",
                            "Każdy próg odblokowuje nową zawartość, a drużyna, która osiągnie wszystkie progi jako pierwsza, wygrywa!",
                        ];
                        embed = new discord_js_1.EmbedBuilder()
                            .setTitle("🥚 Rozbij jajco! 🥚")
                            .setDescription(lines.join("\n"))
                            .addFields({ name: "Jak dołączyć?", value: "Użyj komendy `/rozbij-jajco dolacz`" }, {
                            name: "Jak sprawdzić postęp?",
                            value: "Spójrz na kanał swojej drużyny.",
                        })
                            .setColor("#FF9933");
                        return [4 /*yield*/, itx.reply({ embeds: [embed] })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .group("rozbij-jajco-admin", function (group) {
    return group
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .setDescription("Zarządzanie eventem Rozbij Jajco 2025")
        .addCommand("ping-druzyna", function (command) {
        return command
            .setDescription("Wygeneruj listę ID członków drużyny do pingowania")
            .addRole("druzyna", function (option) { return option.setDescription("Rola drużyny"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var team, memberIds;
            var prisma = _c.prisma;
            var teamRole = _d.druzyna;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.easter2025Team.findUnique({
                                where: { roleId: teamRole.id },
                                include: { teamMembers: true },
                            })];
                    case 2:
                        team = _e.sent();
                        if (!!team) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono podanej drużyny!")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4:
                        memberIds = team.teamMembers.map(function (member) { return member.userId; });
                        return [4 /*yield*/, (0, safeSendCode_1.default)(itx.editReply.bind(itx), memberIds.join(" "), "")];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("zmien-jajco", function (command) {
        return command
            .setDescription("Zmień drużynę użytkownika (tylko dla moderatorów)")
            .addUser("user", function (option) { return option.setDescription("Użytkownik"); })
            .addRole("druzyna", function (option) { return option.setDescription("Rola drużyny"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var newTeam, targetMember, currentMembership, confirmation, result;
            var prisma = _c.prisma;
            var user = _d.user, teamRole = _d.druzyna;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.easter2025Team.findUnique({
                                where: { roleId: teamRole.id },
                            })];
                    case 2:
                        newTeam = _e.sent();
                        if (!!newTeam) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono podanej drużyny!")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4: return [4 /*yield*/, itx.guild.members.fetch(user.id)];
                    case 5:
                        targetMember = _e.sent();
                        return [4 /*yield*/, prisma.easter2025TeamMember.findUnique({
                                where: { userId: user.id },
                                include: { team: true },
                            })];
                    case 6:
                        currentMembership = _e.sent();
                        return [4 /*yield*/, (0, core_1.waitForConfirmation)({ send: itx.editReply.bind(itx) }, "Czy na pewno chcesz zmieni\u0107 dru\u017Cyn\u0119 u\u017Cytkownika ".concat((0, discord_js_1.bold)(user.tag), " ").concat(currentMembership
                                ? "z ".concat((0, discord_js_1.bold)(currentMembership.team.name))
                                : "(obecnie bez drużyny)", " na ").concat((0, discord_js_1.bold)(newTeam.name), "?"), "Tak", "Nie", function (action) { return action.user.id === itx.user.id; })];
                    case 7:
                        confirmation = _e.sent();
                        if (!!confirmation) return [3 /*break*/, 9];
                        return [4 /*yield*/, itx.editReply({
                                content: "Anulowano zmianę drużyny.",
                                components: [],
                            })];
                    case 8:
                        _e.sent();
                        return [2 /*return*/];
                    case 9: return [4 /*yield*/, updateMembership(prisma, targetMember, newTeam.id)];
                    case 10:
                        result = _e.sent();
                        if (!result.previousRoleId) return [3 /*break*/, 12];
                        return [4 /*yield*/, targetMember.roles.remove(result.previousRoleId, "Zmieniono drużynę")];
                    case 11:
                        _e.sent();
                        _e.label = 12;
                    case 12: return [4 /*yield*/, targetMember.roles.add(newTeam.roleId, "Zmieniono drużynę")];
                    case 13:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Pomy\u015Blnie zmieniono dru\u017Cyn\u0119 u\u017Cytkownika ".concat((0, discord_js_1.bold)(user.tag), " na ").concat((0, discord_js_1.bold)(newTeam.name), "!"),
                                components: [],
                            })];
                    case 14:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("dodaj-druzyne", function (command) {
        return command
            .setDescription("Dodaj nową drużynę do eventu")
            .addString("nazwa", function (option) { return option.setDescription("Nazwa drużyny"); })
            .addRole("rola", function (option) { return option.setDescription("Rola drużyny"); })
            .addChannel("kanal", function (option) {
            return option.setDescription("Kanal ze statusem drużyny");
        })
            .addString("kolor", function (option) { return option.setDescription("Kolor drużyny (hex)"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var color, existingTeam, newTeam;
            var prisma = _c.prisma;
            var name = _d.nazwa, teamRole = _d.rola, channel = _d.kanal, colorHex = _d.kolor;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        color = Bun.color(colorHex, "number");
                        if (!!color) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podany kolor nie jest poprawny!")];
                    case 1: return [2 /*return*/, _e.sent()];
                    case 2:
                        if (!!channel.isTextBased()) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podany kanał nie jest tekstowy!")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4: return [4 /*yield*/, itx.deferReply()];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, prisma.easter2025Team.findUnique({
                                where: { roleId: teamRole.id },
                            })];
                    case 6:
                        existingTeam = _e.sent();
                        if (!existingTeam) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Drużyna z tą rolą już istnieje!")];
                    case 7: return [2 /*return*/, _e.sent()];
                    case 8: return [4 /*yield*/, prisma.easter2025Team.create({
                            data: {
                                name: name,
                                roleId: teamRole.id,
                                statusChannelId: channel.id,
                                color: color,
                            },
                        })];
                    case 9:
                        newTeam = _e.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Pomy\u015Blnie dodano dru\u017Cyn\u0119 ".concat((0, discord_js_1.bold)(newTeam.name), "!"),
                            })];
                    case 10:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("dodaj-etap", function (command) {
        return command
            .setDescription("Dodaj nowy etap do eventu")
            .addNumber("punkty", function (option) {
            return option.setMinValue(0).setDescription("Liczba wiadomości do napisania");
        })
            .addRole("druzyna", function (option) { return option.setDescription("Rola drużyny"); })
            .addString("obrazek", function (option) { return option.setDescription("Link do obrazka"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var team, newStage;
            var prisma = _c.prisma;
            var points = _d.punkty, teamRole = _d.druzyna, image = _d.obrazek;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.easter2025Team.findUnique({
                                where: { roleId: teamRole.id },
                            })];
                    case 2:
                        team = _e.sent();
                        if (!!team) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono podanej drużyny!")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4: return [4 /*yield*/, prisma.easter2025Stage.create({
                            data: {
                                neededPoints: points,
                                linkedImageUrl: image,
                                teamId: team.id,
                            },
                        })];
                    case 5:
                        newStage = _e.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Pomy\u015Blnie dodano nowy etap do dru\u017Cyny ".concat((0, discord_js_1.bold)(team.name), ": ").concat((0, discord_js_1.bold)(newStage.neededPoints.toString()), " wiadomo\u015Bci!"),
                            })];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("dodaj-wylaczone-kanal", function (command) {
        return command
            .setDescription("Dodaj kanał, który nie będzie liczony do eventu")
            .addString("kanaly", function (option) {
            return option.setDescription("Kanał do wykluczenia");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var channels, count;
            var prisma = _c.prisma;
            var rawChannels = _d.kanaly;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        channels = rawChannels.split(",").map(function (channel) { return channel.trim(); });
                        return [4 /*yield*/, prisma.easter2025DisabledChannels.createMany({
                                data: channels.map(function (channel) { return ({ channelId: channel }); }),
                            })];
                    case 2:
                        count = (_e.sent()).count;
                        return [4 /*yield*/, itx.editReply({
                                content: "Pomy\u015Blnie dodano ".concat(count, " kana\u0142\u00F3w do listy wykluczonych!"),
                            })];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("wylaczone-kanaly", function (command) {
        return command
            .setDescription("Wyświetl listę wykluczonych kanałów")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var paginator, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        paginator = new db_1.DatabasePaginator(function (props) { return prisma.easter2025DisabledChannels.findMany(props); }, function () { return prisma.easter2025DisabledChannels.count(); });
                        paginatedView = new core_1.PaginatedView(paginator, "Wykluczone kanały", function (channel) {
                            return "Kana\u0142 ".concat((0, discord_js_1.channelMention)(channel.channelId), " (").concat(channel.channelId, ")");
                        }, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("etapy", function (command) {
        return command
            .setDescription("Wyświetl etapy eventu")
            .addRole("druzyna", function (option) { return option.setDescription("Rola drużyny"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var where, paginator, paginatedView;
            var prisma = _c.prisma;
            var teamRole = _d.druzyna;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        where = { team: { roleId: teamRole.id } };
                        paginator = new db_1.DatabasePaginator(function (props, order) {
                            return prisma.easter2025Stage.findMany(__assign({ where: where, orderBy: { neededPoints: order } }, props));
                        }, function () { return prisma.easter2025Stage.count({ where: where }); });
                        paginatedView = new core_1.PaginatedView(paginator, "Etapy eventu dla drużyny", function (stage, idx) {
                            var imageLink = (0, discord_js_1.hyperlink)("[OBRAZEK]", stage.linkedImageUrl);
                            return "".concat(idx, ". ").concat((0, discord_js_1.bold)(stage.neededPoints.toString()), " wiadomo\u015Bci ").concat(imageLink);
                        }, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("wyczysc-etapy", function (command) {
        return command
            .setDescription("Wyczyść etapy eventu")
            .addRole("druzyna", function (option) { return option.setDescription("Rola drużyny"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var team, confirmation;
            var prisma = _c.prisma;
            var teamRole = _d.druzyna;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.easter2025Team.findUnique({
                                where: { roleId: teamRole.id },
                            })];
                    case 2:
                        team = _e.sent();
                        if (!!team) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono podanej drużyny!")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4: return [4 /*yield*/, (0, core_1.waitForConfirmation)({ send: itx.editReply.bind(itx) }, "Czy na pewno chcesz usun\u0105\u0107 wszystkie etapy dru\u017Cyny ".concat((0, discord_js_1.bold)(team.name), "?"), "Tak", "Nie", function (action) { return action.user.id === itx.user.id; })];
                    case 5:
                        confirmation = _e.sent();
                        if (!!confirmation) return [3 /*break*/, 7];
                        return [4 /*yield*/, itx.editReply({
                                content: "Anulowano usunięcie etapów.",
                                components: [],
                            })];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                    case 7: return [4 /*yield*/, prisma.easter2025Stage.deleteMany({
                            where: { teamId: team.id },
                        })];
                    case 8:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Pomy\u015Blnie usuni\u0119to wszystkie etapy dru\u017Cyny ".concat((0, discord_js_1.bold)(team.name), "!"),
                            })];
                    case 9:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("ready", function (_a, client_1) { return __awaiter(void 0, [_a, client_1], void 0, function (_b, client) {
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.log("Easter 2025 module ready!");
                setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, updateStatusChannel(client, prisma)];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                error_1 = _a.sent();
                                console.error("Error updating Easter 2025 status:", error_1);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); }, 60 * 1000);
                return [4 /*yield*/, updateStatusChannel(client, prisma)];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
var getTeamMessage = function (client, team) { return __awaiter(void 0, void 0, void 0, function () {
    var statusLastMessageId, channel;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                statusLastMessageId = team.statusLastMessageId;
                if (!statusLastMessageId)
                    return [2 /*return*/, null];
                channel = client.channels.cache.get(team.statusChannelId);
                if (!channel || !channel.isSendable()) {
                    throw new Error("Channel ".concat(team.statusChannelId, " is not sendable or not found."));
                }
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return channel.messages.fetch({ message: statusLastMessageId, cache: false }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMessage], function () { return null; })];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
function updateTeamStatus(client, prisma, team) {
    return __awaiter(this, void 0, void 0, function () {
        var channel, _a, embed, passedThreshold, message, sentMessage;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    channel = client.channels.cache.get(team.statusChannelId);
                    if (!channel || !channel.isSendable())
                        return [2 /*return*/];
                    return [4 /*yield*/, getTeamEmbed(prisma, team)];
                case 1:
                    _a = _b.sent(), embed = _a.embed, passedThreshold = _a.passedThreshold;
                    return [4 /*yield*/, getTeamMessage(client, team)];
                case 2:
                    message = _b.sent();
                    if (!message) return [3 /*break*/, 4];
                    return [4 /*yield*/, message.edit({ embeds: [embed] })];
                case 3:
                    _b.sent();
                    return [2 /*return*/];
                case 4: return [4 /*yield*/, channel.send({ embeds: [embed] })];
                case 5:
                    sentMessage = _b.sent();
                    return [4 /*yield*/, prisma.easter2025Team.update({
                            where: { id: team.id },
                            data: { statusLastMessageId: sentMessage.id },
                        })];
                case 6:
                    _b.sent();
                    if (!passedThreshold) return [3 /*break*/, 8];
                    return [4 /*yield*/, channel.send({
                            content: "Gratulacje! ".concat((0, discord_js_1.roleMention)(team.roleId), ", osi\u0105gn\u0119li\u015Bcie nowy pr\u00F3g!"),
                        })];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    });
}
function updateStatusChannel(client, prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var teams;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.easter2025Team.findMany()];
                case 1:
                    teams = _a.sent();
                    return [2 /*return*/, Promise.all(teams.map(function (team) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, updateTeamStatus(client, prisma, team)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
            }
        });
    });
}
var templateObject_1;
