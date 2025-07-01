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
exports.ultimatum = exports.getCurrentUltimatum = exports.isUltimatumActive = exports.getLatestUltimatum = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var specializedConstants_1 = require("../specializedConstants");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var getLatestUltimatum = function (prisma, guild, user) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, prisma.ultimatum.findFirst({
                where: { userId: user.id, guildId: guild.id },
                orderBy: { createdAt: "desc" },
            })];
    });
}); };
exports.getLatestUltimatum = getLatestUltimatum;
var isUltimatumActive = function (ultimatum) { return !ultimatum.endedAt; };
exports.isUltimatumActive = isUltimatumActive;
var getCurrentUltimatum = function (prisma, guild, user) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, prisma.ultimatum.findFirst({
                where: { userId: user.id, guildId: guild.id, endedAt: null },
            })];
    });
}); };
exports.getCurrentUltimatum = getCurrentUltimatum;
var ULTIMATUM_TEMPLATE = "\n## Hejka {{mention}}!\nPrzed chwil\u0105 **na\u0142o\u017Cy\u0142em Ci rol\u0119 Ultimatum**. Je\u017Celi przez najbli\u017Csze **60 dni** otrzymasz jak\u0105kolwiek **kar\u0119 Mute** na naszym serwerze, to niestety b\u0119d\u0119 musia\u0142 **zamieni\u0107 Ci j\u0105 na bana** - na tym polega posiadanie Ultimatum. Mam nadziej\u0119, \u017Ce przez najbli\u017Csze dwa miesi\u0105ce nie z\u0142amiesz naszych Zasad dost\u0119pnych pod [tym linkiem](https://discord.com/channels/211261411119202305/873167662082056232/1270484486131290255) i zostaniesz z nami na serwerze na d\u0142u\u017Cej. W razie pyta\u0144 zapraszam Ci\u0119 na nasz [kana\u0142 od ticket\u00F3w](https://discord.com/channels/211261411119202305/1213901611836117052/1219338768012804106).\n\n**Oto pow\u00F3d Twojego Ultimatum:**\n*{{reason}}*\n\nPozdrawiam,\nBiszkopt\n";
var composeUltimatumMessage = function (user, reason) {
    return ULTIMATUM_TEMPLATE.replace("{{mention}}", user.toString()).replace("{{reason}}", (0, discord_js_1.italic)(reason));
};
exports.ultimatum = new core_1.Hashira({ name: "ultimatum" })
    .use(base_1.base)
    .group("ultimatum", function (group) {
    return group
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .setDescription("Zarządzaj ultimatum użytkowników")
        .addCommand("dodaj", function (command) {
        return command
            .setDescription("Dodaj użytkownikowi ultimatum")
            .addUser("użytkownik", function (user) { return user.setDescription("Użytkownik"); })
            .addString("powód", function (reason) { return reason.setDescription("Powód ultimatum"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var member, currentUltimatum, createdAt, expiresAt, createdUltimatum;
            var prisma = _c.prisma, messageQueue = _c.messageQueue, strataCzasuLog = _c.strataCzasuLog;
            var user = _d.użytkownik, reason = _d.powód;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, itx.guild.members.fetch(user.id)];
                    case 2:
                        member = _e.sent();
                        if (!!member) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.editReply("Nie znaleziono użytkownika na serwerze")];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [itx.user, user])];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, (0, exports.getCurrentUltimatum)(prisma, itx.guild, user)];
                    case 6:
                        currentUltimatum = _e.sent();
                        if (!currentUltimatum) return [3 /*break*/, 8];
                        return [4 /*yield*/, itx.editReply("Użytkownik ma już aktywne ultimatum")];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                    case 8:
                        createdAt = new Date();
                        expiresAt = (0, date_fns_1.addSeconds)(createdAt, specializedConstants_1.STRATA_CZASU.ULTIMATUM_DURATION);
                        return [4 /*yield*/, prisma.ultimatum.create({
                                data: {
                                    userId: user.id,
                                    guildId: itx.guild.id,
                                    createdAt: createdAt,
                                    expiresAt: expiresAt,
                                    reason: reason,
                                },
                            })];
                    case 9:
                        createdUltimatum = _e.sent();
                        return [4 /*yield*/, member.roles.add(specializedConstants_1.STRATA_CZASU.ULTIMATUM_ROLE, "Dodano ultimatum: ".concat(reason, " (").concat(expiresAt, ") przez ").concat(itx.user.tag))];
                    case 10:
                        _e.sent();
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, composeUltimatumMessage(user, reason))];
                    case 11:
                        _e.sent();
                        strataCzasuLog.push("ultimatumStart", itx.guild, {
                            user: user,
                            reason: reason,
                            createdAt: createdAt,
                            expiresAt: expiresAt,
                        });
                        return [4 /*yield*/, messageQueue.push("ultimatumEnd", { guildId: itx.guild.id, userId: user.id }, expiresAt, createdUltimatum.id.toString())];
                    case 12:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Dodano ultimatum")];
                    case 13:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("list", function (command) {
        return command
            .setDescription("Wyświetl aktywne ultimatum")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var ultimatums, content;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, prisma.ultimatum.findMany({
                                where: { guildId: itx.guild.id, endedAt: null },
                            })];
                    case 2:
                        ultimatums = _c.sent();
                        if (!!ultimatums.length) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.editReply("Brak aktywnych ultimatum")];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                    case 4:
                        content = ultimatums
                            .map(function (ultimatum) {
                            return "**".concat(ultimatum.id, "** - <@").concat(ultimatum.userId, "> - ").concat(ultimatum.reason);
                        })
                            .join("\n");
                        return [4 /*yield*/, itx.editReply(content)];
                    case 5:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("zakończ", function (command) {
        return command
            .setDescription("Zakończ aktywne ultimatum")
            .addUser("użytkownik", function (user) { return user.setDescription("Użytkownik"); })
            .addBoolean("force", function (force) {
            return force.setDescription("Zakończ ultimatum siłą").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var ultimatum;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var user = _d.użytkownik, force = _d.force;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, exports.getCurrentUltimatum)(prisma, itx.guild, user)];
                    case 2:
                        ultimatum = _e.sent();
                        if (!!ultimatum) return [3 /*break*/, 4];
                        return [4 /*yield*/, itx.editReply("Nie znaleziono aktywnego ultimatum")];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, messageQueue.updateDelay("ultimatumEnd", ultimatum.id.toString(), new Date())];
                    case 5:
                        _e.sent();
                        if (!force) return [3 /*break*/, 7];
                        return [4 /*yield*/, prisma.ultimatum.update({
                                where: { id: ultimatum.id },
                                data: { endedAt: new Date() },
                            })];
                    case 6:
                        _e.sent();
                        _e.label = 7;
                    case 7: return [4 /*yield*/, itx.editReply("Zakończono ultimatum")];
                    case 8:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("guildMemberAdd", function (_a, member_1) { return __awaiter(void 0, [_a, member_1], void 0, function (_b, member) {
    var ultimatum;
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, exports.getCurrentUltimatum)(prisma, member.guild, member.user)];
            case 1:
                ultimatum = _c.sent();
                if (!ultimatum)
                    return [2 /*return*/];
                return [4 /*yield*/, member.roles.add(specializedConstants_1.STRATA_CZASU.ULTIMATUM_ROLE, "Dodano ultimatum")];
            case 2:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
