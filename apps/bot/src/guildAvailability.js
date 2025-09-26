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
exports.guildAvailability = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var specializedConstants_1 = require("./specializedConstants");
var ALLOWED_GUILDS = Object.values(specializedConstants_1.GUILD_IDS);
function createGuildSettings(prisma, guildId) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma.guild.create({
                            data: { id: guildId, guildSettings: { create: {} } },
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    // P2002: Unique constraint
                    if (e_1 instanceof db_1.Prisma.PrismaClientKnownRequestError && e_1.code === "P2002")
                        return [2 /*return*/];
                    throw e_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function registerGuildLogger(log, guild, channelId) {
    return __awaiter(this, void 0, void 0, function () {
        var channel;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, guild.channels.fetch(channelId)];
                case 1:
                    channel = _a.sent();
                    if (!channel)
                        throw new Error("Log channel ".concat(channelId, " not found for guild ").concat(guild.id));
                    if (!channel.isTextBased())
                        throw new Error("Log channel ".concat(channelId, " for guild ").concat(guild.id, " is not text based"));
                    log.updateGuild(guild, channel);
                    return [2 /*return*/];
            }
        });
    });
}
function registerGuildLoggers(ctx, guild) {
    return __awaiter(this, void 0, void 0, function () {
        var settings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.prisma.guildSettings.findFirst({
                        where: { guildId: guild.id },
                        select: { logSettings: true },
                    })];
                case 1:
                    settings = _a.sent();
                    if (!(settings === null || settings === void 0 ? void 0 : settings.logSettings))
                        return [2 /*return*/];
                    if (!settings.logSettings.messageLogChannelId) return [3 /*break*/, 3];
                    return [4 /*yield*/, registerGuildLogger(ctx.messageLog, guild, settings.logSettings.messageLogChannelId)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    if (!settings.logSettings.memberLogChannelId) return [3 /*break*/, 5];
                    return [4 /*yield*/, registerGuildLogger(ctx.memberLog, guild, settings.logSettings.memberLogChannelId)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    if (!settings.logSettings.roleLogChannelId) return [3 /*break*/, 7];
                    return [4 /*yield*/, registerGuildLogger(ctx.roleLog, guild, settings.logSettings.roleLogChannelId)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    if (!settings.logSettings.moderationLogChannelId) return [3 /*break*/, 9];
                    return [4 /*yield*/, registerGuildLogger(ctx.moderationLog, guild, settings.logSettings.moderationLogChannelId)];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    if (!settings.logSettings.profileLogChannelId) return [3 /*break*/, 11];
                    return [4 /*yield*/, registerGuildLogger(ctx.profileLog, guild, settings.logSettings.profileLogChannelId)];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    if (!settings.logSettings.economyLogChannelId) return [3 /*break*/, 13];
                    return [4 /*yield*/, registerGuildLogger(ctx.economyLog, guild, settings.logSettings.economyLogChannelId)];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13: return [2 /*return*/];
            }
        });
    });
}
function processAllowedGuild(ctx, guild) {
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createGuildSettings(ctx.prisma, guild.id)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, registerGuildLoggers(ctx, guild)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, guild.members.fetch()];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_2 = _a.sent();
                    if (!(e_2 instanceof discord_js_1.DiscordAPIError))
                        throw e_2;
                    console.error("Failed to prefetch members for guild ".concat(guild.id, ": ").concat(e_2.code, " - ").concat(e_2.message));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function leaveGuild(guild) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log("Leaving guild: ".concat(guild.name, ", owner: ").concat(guild.ownerId));
            guild.leave();
            return [2 /*return*/];
        });
    });
}
exports.guildAvailability = new core_1.Hashira({ name: "guild-availability" })
    .use(base_1.base)
    .handle("guildAvailable", function (ctx, guild) { return __awaiter(void 0, void 0, void 0, function () {
    var e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!ALLOWED_GUILDS.includes(guild.id)) return [3 /*break*/, 2];
                return [4 /*yield*/, leaveGuild(guild)];
            case 1:
                _a.sent();
                return [2 /*return*/];
            case 2: return [4 /*yield*/, processAllowedGuild(ctx, guild)];
            case 3:
                _a.sent();
                if (!(guild.id === specializedConstants_1.STRATA_CZASU.GUILD_ID)) return [3 /*break*/, 7];
                _a.label = 4;
            case 4:
                _a.trys.push([4, 6, , 7]);
                return [4 /*yield*/, registerGuildLogger(ctx.strataCzasuLog, guild, specializedConstants_1.STRATA_CZASU.MOD_LOG_CHANNEL_ID)];
            case 5:
                _a.sent();
                ctx.strataCzasuLog.start(guild.client);
                return [3 /*break*/, 7];
            case 6:
                e_3 = _a.sent();
                if (!(e_3 instanceof discord_js_1.DiscordAPIError)) {
                    console.error("Failed to register Strata Czasu logger", e_3);
                }
                else {
                    console.error("Failed to register Strata Czasu logger: ".concat(e_3.code, " - ").concat(e_3.message));
                }
                return [3 /*break*/, 7];
            case 7:
                console.log("Guild available: ".concat(guild.name, ", owner: ").concat(guild.ownerId));
                return [2 /*return*/];
        }
    });
}); })
    .handle("guildCreate", function (ctx, guild) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!ALLOWED_GUILDS.includes(guild.id)) return [3 /*break*/, 2];
                return [4 /*yield*/, leaveGuild(guild)];
            case 1:
                _a.sent();
                return [2 /*return*/];
            case 2: return [4 /*yield*/, processAllowedGuild(ctx, guild)];
            case 3:
                _a.sent();
                console.log("New guild: ".concat(guild.name, ", owner: ").concat(guild.ownerId));
                return [2 /*return*/];
        }
    });
}); })
    .handle("ready", function (ctx, client) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        ctx.messageLog.start(client);
        ctx.memberLog.start(client);
        ctx.roleLog.start(client);
        ctx.moderationLog.start(client);
        ctx.profileLog.start(client);
        ctx.economyLog.start(client);
        console.log("Loggers started");
        ctx.userTextActivityQueue.start(ctx.prisma, ctx.redis);
        ctx.stickyMessageCache.start(ctx.prisma);
        ctx.emojiCountingQueue.start(ctx.prisma, ctx.redis);
        console.log("Queues started");
        return [2 /*return*/];
    });
}); });
