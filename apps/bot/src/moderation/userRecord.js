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
exports.userRecord = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var util_1 = require("../userActivity/util");
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var util_2 = require("./util");
var verification_1 = require("./verification");
var forceNewline = function (text) { return "".concat(text, "\n\u200E"); };
exports.userRecord = new core_1.Hashira({ name: "user-record" })
    .use(base_1.base)
    .command("kartoteka", function (command) {
    return command
        .setDescription("Sprawdź kartotekę użytkownika")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
        .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
        var dbUser, member, embed, verificationStatusParts, verification, mutes, joinedMutes, warns, joinedWarns, channelRestrictions, joinedRestrictions, activitySince, textActivity, voiceActivitySeconds, activityLines;
        var prisma = _c.prisma;
        var user = _d.user;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, user)];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, prisma.user.findFirst({ where: { id: user.id } })];
                case 3:
                    dbUser = _e.sent();
                    if (!dbUser)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, itx.guild.members.fetch(user.id)];
                        }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return null; })];
                case 4:
                    member = _e.sent();
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle("Kartoteka ".concat(user.tag))
                        .setFooter({
                        text: user.id,
                        iconURL: user.displayAvatarURL(),
                    })
                        .addFields({
                        name: "📆 Data założenia konta",
                        value: forceNewline("".concat((0, discord_js_1.time)(user.createdAt, discord_js_1.TimestampStyles.ShortDateTime), " (").concat((0, discord_js_1.time)(user.createdAt, discord_js_1.TimestampStyles.RelativeTime), ")")),
                    });
                    verificationStatusParts = [
                        (0, verification_1.formatVerificationType)(dbUser.verificationLevel),
                    ];
                    return [4 /*yield*/, prisma.verification.findFirst({
                            where: {
                                guildId: itx.guild.id,
                                userId: user.id,
                                acceptedAt: { not: null },
                            },
                            orderBy: { acceptedAt: "desc" },
                        })];
                case 5:
                    verification = _e.sent();
                    if (verification === null || verification === void 0 ? void 0 : verification.acceptedAt) {
                        verificationStatusParts.push("(przyj\u0119to ".concat((0, discord_js_1.time)(verification.acceptedAt, discord_js_1.TimestampStyles.ShortDateTime), ")"));
                    }
                    embed.addFields({
                        name: "🔞 Poziom weryfikacji",
                        value: forceNewline(verificationStatusParts.join(" ")),
                    });
                    if (!member) return [3 /*break*/, 11];
                    return [4 /*yield*/, prisma.mute.findMany({
                            where: {
                                deletedAt: null,
                                guildId: itx.guild.id,
                                userId: member.id,
                            },
                            orderBy: { createdAt: "desc" },
                            take: 3,
                        })];
                case 6:
                    mutes = _e.sent();
                    if (mutes.length > 0) {
                        joinedMutes = mutes
                            .map(function (m) {
                            return "".concat((0, discord_js_1.time)(m.createdAt, discord_js_1.TimestampStyles.ShortDateTime), "+").concat((0, util_2.formatMuteLength)(m), " ").concat((0, discord_js_1.italic)(m.reason));
                        })
                            .join("\n");
                        embed.addFields({
                            name: "🔇 Ostatnie wyciszenia",
                            value: forceNewline(joinedMutes),
                        });
                    }
                    return [4 /*yield*/, prisma.warn.findMany({
                            where: {
                                deletedAt: null,
                                guildId: itx.guild.id,
                                userId: member.id,
                            },
                            orderBy: { createdAt: "desc" },
                            take: 3,
                        })];
                case 7:
                    warns = _e.sent();
                    if (warns.length > 0) {
                        joinedWarns = warns
                            .map(function (w) {
                            return "".concat((0, discord_js_1.time)(w.createdAt, discord_js_1.TimestampStyles.ShortDateTime), " ").concat((0, discord_js_1.italic)(w.reason));
                        })
                            .join("\n");
                        embed.addFields({
                            name: "⚠️ Ostatnie ostrzeżenia",
                            value: forceNewline(joinedWarns),
                        });
                    }
                    return [4 /*yield*/, prisma.channelRestriction.findMany({
                            where: {
                                guildId: itx.guild.id,
                                userId: member.id,
                            },
                            orderBy: { createdAt: "desc" },
                            take: 3,
                        })];
                case 8:
                    channelRestrictions = _e.sent();
                    if (channelRestrictions.length > 0) {
                        joinedRestrictions = channelRestrictions
                            .map(function (cr) {
                            var line = "".concat((0, discord_js_1.time)(cr.createdAt, discord_js_1.TimestampStyles.ShortDateTime), " ").concat((0, discord_js_1.italic)(cr.reason));
                            return cr.deletedAt ? (0, discord_js_1.strikethrough)(line) : line;
                        })
                            .join("\n");
                        embed.addFields({
                            name: "🚫 Ostatnio odebrane dostępy",
                            value: forceNewline(joinedRestrictions),
                        });
                    }
                    activitySince = (0, date_fns_1.sub)(itx.createdAt, { days: 30 });
                    return [4 /*yield*/, (0, util_1.getUserTextActivity)({
                            prisma: prisma,
                            guildId: itx.guildId,
                            userId: user.id,
                            since: activitySince,
                        })];
                case 9:
                    textActivity = _e.sent();
                    return [4 /*yield*/, (0, util_1.getUserVoiceActivity)({
                            prisma: prisma,
                            guildId: itx.guildId,
                            userId: user.id,
                            since: activitySince,
                        })];
                case 10:
                    voiceActivitySeconds = _e.sent();
                    activityLines = [
                        "\uD83C\uDF99\uFE0F ".concat((0, date_fns_1.secondsToHours)(voiceActivitySeconds), "h"),
                        "\uD83D\uDDE8\uFE0F ".concat(textActivity, " wiad."),
                    ];
                    embed.addFields({
                        name: "Aktywność z 30 dni",
                        value: forceNewline(activityLines.join(" | ")),
                    });
                    _e.label = 11;
                case 11:
                    if (member === null || member === void 0 ? void 0 : member.joinedAt) {
                        embed.addFields({
                            name: "📆 Data dołączenia na serwer",
                            value: "".concat((0, discord_js_1.time)(member.joinedAt, discord_js_1.TimestampStyles.ShortDateTime), " (").concat((0, discord_js_1.time)(member.joinedAt, discord_js_1.TimestampStyles.RelativeTime), ")"),
                        });
                    }
                    return [4 /*yield*/, itx.editReply({ embeds: [embed] })];
                case 12:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
