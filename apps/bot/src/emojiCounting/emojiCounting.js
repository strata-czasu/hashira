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
exports.emojiCounting = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var dateParsing_1 = require("../util/dateParsing");
var discordTry_1 = require("../util/discordTry");
var errorFollowUp_1 = require("../util/errorFollowUp");
var EMOJI_REGEX = /(?<!\\)<a?:[^:]+:(\d+)>/g;
var parseEmojis = function (guildEmojiManager, content) {
    var matches = content.matchAll(EMOJI_REGEX);
    if (!matches)
        return [];
    var emojis = [];
    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
        var match = matches_1[_i];
        var emojiId = match[1];
        if (!emojiId)
            continue;
        var emoji = guildEmojiManager.resolve(emojiId);
        if (!emoji)
            continue;
        emojis.push(emoji);
    }
    return emojis;
};
exports.emojiCounting = new core_1.Hashira({ name: "emoji-counting" })
    .use(base_1.base)
    .handle("guildMessageCreate", function (_a, message_1) { return __awaiter(void 0, [_a, message_1], void 0, function (_b, message) {
    var matches, guildEmojis;
    var emojiCountingQueue = _b.emojiCountingQueue;
    return __generator(this, function (_c) {
        if (message.author.bot)
            return [2 /*return*/];
        matches = message.content.matchAll(EMOJI_REGEX);
        if (!matches)
            return [2 /*return*/];
        guildEmojis = parseEmojis(message.guild.emojis, message.content);
        if (guildEmojis.length === 0)
            return [2 /*return*/];
        emojiCountingQueue.push(message.channelId, guildEmojis.map(function (emoji) { return ({
            userId: message.author.id,
            emojiId: emoji.id,
            guild: { connect: { id: message.guild.id } },
        }); }));
        return [2 /*return*/];
    });
}); })
    .group("emojistats", function (group) {
    return group
        .setDescription("Get emoji usage stats")
        .addCommand("user", function (command) {
        return command
            .setDescription("Get emoji usage stats for a user")
            .addUser("user", function (option) {
            return option.setDescription("The user to get stats for");
        })
            .addString("after", function (option) {
            return option.setDescription("The date to end at").setRequired(false);
        })
            .addString("before", function (option) {
            return option.setDescription("The date to start from").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var after, before, where, paginate, paginator;
            var prisma = _c.prisma;
            var user = _d.user, rawAfter = _d.after, rawBefore = _d.before;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        after = (0, dateParsing_1.parseDate)(rawAfter, "start", function () { return new Date(0); });
                        before = (0, dateParsing_1.parseDate)(rawBefore, "end", function () { return new Date(); });
                        where = {
                            userId: user.id,
                            timestamp: { gte: after, lte: before },
                        };
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.emojiUsage.groupBy(__assign(__assign({}, props), { by: "emojiId", where: where, _count: true, orderBy: [{ _count: { emojiId: ordering } }, { emojiId: ordering }] }));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.emojiUsage.groupBy({
                                            by: "emojiId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        paginator = new core_1.PaginatedView(paginate, "Emoji stats for <@".concat(user.id, ">"), function (item, idx) { return "".concat(idx, ". ").concat(item.emojiId, " - ").concat(item._count); }, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("emoji", function (command) {
        return command
            .setDescription("Get emoji usage stats for an emoji")
            .addString("emoji", function (option) {
            return option.setDescription("The emoji to get stats for");
        })
            .addString("after", function (option) {
            return option.setDescription("The date to end at").setRequired(false);
        })
            .addString("before", function (option) {
            return option.setDescription("The date to start from").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var emojis, emoji, after, before, where, paginate, paginator;
            var prisma = _c.prisma;
            var rawEmoji = _d.emoji, rawAfter = _d.after, rawBefore = _d.before;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        emojis = parseEmojis(itx.guild.emojis, rawEmoji);
                        emoji = emojis[0];
                        if (!(emojis.length !== 1 || !emoji)) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Please provide exactly one emoji")];
                    case 1: return [2 /*return*/, _e.sent()];
                    case 2:
                        after = (0, dateParsing_1.parseDate)(rawAfter, "start", function () { return new Date(0); });
                        before = (0, dateParsing_1.parseDate)(rawBefore, "end", function () { return new Date(); });
                        where = {
                            emojiId: emoji.id,
                            timestamp: { gte: after, lte: before },
                        };
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.emojiUsage.groupBy(__assign(__assign({}, props), { by: "userId", where: where, _count: true, orderBy: [{ _count: { userId: ordering } }, { userId: ordering }] }));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.emojiUsage.groupBy({
                                            by: "userId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        paginator = new core_1.PaginatedView(paginate, "Emoji stats for ".concat(emoji.name), function (item, idx) { return "".concat(idx, ". <@").concat(item.userId, "> - ").concat(item._count); }, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("guild", function (command) {
        return command
            .setDescription("Get emoji usage stats for the guild")
            .addString("after", function (option) {
            return option.setDescription("The date to end at").setRequired(false);
        })
            .addString("before", function (option) {
            return option.setDescription("The date to start from").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var after, before, where, paginate, paginator;
            var prisma = _c.prisma;
            var rawAfter = _d.after, rawBefore = _d.before;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        after = (0, dateParsing_1.parseDate)(rawAfter, "start", function () { return new Date(0); });
                        before = (0, dateParsing_1.parseDate)(rawBefore, "end", function () { return new Date(); });
                        where = {
                            guildId: itx.guild.id,
                            timestamp: { gte: after, lte: before },
                        };
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.emojiUsage.groupBy(__assign(__assign({}, props), { by: "emojiId", where: where, _count: true, orderBy: [{ _count: { emojiId: ordering } }, { emojiId: ordering }] }));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.emojiUsage.groupBy({
                                            by: "emojiId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        paginator = new core_1.PaginatedView(paginate, "Guild emoji stats", function (item, idx) { return __awaiter(void 0, void 0, void 0, function () {
                            var emoji;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return itx.guild.emojis.fetch(item.emojiId); }, [discord_js_1.RESTJSONErrorCodes.UnknownEmoji], function () { return "unknown emoji"; })];
                                    case 1:
                                        emoji = _a.sent();
                                        return [2 /*return*/, "".concat(idx, ". ").concat(emoji, " - ").concat(item._count)];
                                }
                            });
                        }); }, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("prune", function (command) {
        return command
            .setDescription("Prune removed emojis from the database")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var guildEmojis, emojiIds;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!!itx.member.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuildExpressions)) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "You do not have the required permissions to run this command")];
                    case 1: return [2 /*return*/, _c.sent()];
                    case 2:
                        guildEmojis = itx.guild.emojis.cache;
                        emojiIds = guildEmojis.map(function (emoji) { return emoji.id; });
                        return [4 /*yield*/, prisma.emojiUsage.deleteMany({
                                where: {
                                    guildId: itx.guild.id,
                                    NOT: { emojiId: { in: emojiIds } },
                                },
                            })];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, itx.reply("Pruned removed emojis")];
                    case 4:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("unused", function (command) {
        return command
            .setDescription("Get unused emojis in the guild")
            .addString("after", function (option) {
            return option.setDescription("The date to end at").setRequired(false);
        })
            .addString("before", function (option) {
            return option.setDescription("The date to start from").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var after, before, guildEmojis, emojiUsages, usedEmojiIds, unusedEmojis, content;
            var prisma = _c.prisma;
            var rawAfter = _d.after, rawBefore = _d.before;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        after = (0, dateParsing_1.parseDate)(rawAfter, "start", function () { return new Date(0); });
                        before = (0, dateParsing_1.parseDate)(rawBefore, "end", function () { return new Date(); });
                        return [4 /*yield*/, itx.guild.emojis.fetch()];
                    case 1:
                        guildEmojis = _e.sent();
                        return [4 /*yield*/, prisma.emojiUsage.findMany({
                                distinct: ["emojiId"],
                                where: {
                                    guildId: itx.guild.id,
                                    timestamp: { gte: after, lte: before },
                                },
                                select: { emojiId: true },
                                orderBy: { emojiId: "asc" },
                            })];
                    case 2:
                        emojiUsages = _e.sent();
                        usedEmojiIds = emojiUsages.map(function (usage) { return usage.emojiId; });
                        unusedEmojis = guildEmojis.filter(function (emoji) { return !usedEmojiIds.includes(emoji.id); });
                        content = unusedEmojis.map(function (emoji) { return emoji.name; }).join("\n");
                        return [4 /*yield*/, itx.reply({
                                files: [
                                    new discord_js_1.AttachmentBuilder(Buffer.from(content), {
                                        name: "unused-emojis.txt",
                                    }),
                                ],
                            })];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
