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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userTextActivity = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var dateParsing_1 = require("../util/dateParsing");
var discordTry_1 = require("../util/discordTry");
var errorFollowUp_1 = require("../util/errorFollowUp");
var fetchMessages_1 = require("../util/fetchMessages");
var isOwner_1 = require("../util/isOwner");
var pluralize_1 = require("../util/pluralize");
var handleStickyMessage = function (stickyMessageCache, message) { return __awaiter(void 0, void 0, void 0, function () {
    var stickyMessage, newMessage;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (message.author.id === ((_a = message.client.user) === null || _a === void 0 ? void 0 : _a.id))
                    return [2 /*return*/];
                return [4 /*yield*/, stickyMessageCache.get(message.channel.id)];
            case 1:
                stickyMessage = _b.sent();
                if (!stickyMessage)
                    return [2 /*return*/];
                (0, discordTry_1.discordTry)(function () { return message.channel.messages.delete(stickyMessage.lastMessageId); }, [discord_js_1.RESTJSONErrorCodes.UnknownMessage], es_toolkit_1.noop); // just ignore the error if cannot remove the message
                return [4 /*yield*/, message.channel.send(stickyMessage.content)];
            case 2:
                newMessage = _b.sent();
                return [4 /*yield*/, stickyMessageCache.update(message.channel.id, newMessage.id)];
            case 3:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); };
var getMedal = function (idx) {
    var _a;
    var medals = ["🥇", "🥈", "🥉"];
    return (_a = medals[idx - 1]) !== null && _a !== void 0 ? _a : null;
};
exports.userTextActivity = new core_1.Hashira({ name: "user-text-activity" })
    .use(base_1.base)
    .group("user-activity", function (group) {
    return group
        .setDescription("User activity related commands")
        .addCommand("preload", function (cmd) {
        return cmd
            .setDescription("Preload user activity data")
            .addChannel("channel", function (option) {
            return option
                .setDescription("The channel to preload")
                .setRequired(false)
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .addNumber("limit", function (option) {
            return option
                .setDescription("The limit of messages to preload")
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100000);
        })
            .addString("before", function (option) {
            return option.setDescription("The id of message to start from").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var channel, before, limit, i, _e, _f, _g, messages, messageData, userData, e_1_1;
            var _h, e_1, _j, _k;
            var _l;
            var prisma = _c.prisma;
            var rawChannel = _d.channel, rawBefore = _d.before, rawLimit = _d.limit;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0: return [4 /*yield*/, (0, isOwner_1.isNotOwner)(itx.user)];
                    case 1:
                        if (_m.sent())
                            return [2 /*return*/];
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        channel = rawChannel !== null && rawChannel !== void 0 ? rawChannel : itx.channel;
                        if (!!channel) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Channel not found")];
                    case 2: return [2 /*return*/, _m.sent()];
                    case 3:
                        before = rawBefore !== null && rawBefore !== void 0 ? rawBefore : discord_js_1.SnowflakeUtil.generate({ timestamp: Date.now() }).toString();
                        limit = rawLimit !== null && rawLimit !== void 0 ? rawLimit : 1000;
                        return [4 /*yield*/, itx.reply({
                                content: "Preloading messages...",
                                flags: "Ephemeral",
                            })];
                    case 4:
                        _m.sent();
                        i = 0;
                        _m.label = 5;
                    case 5:
                        _m.trys.push([5, 12, 13, 18]);
                        _e = true, _f = __asyncValues((0, fetchMessages_1.fetchMessages)(channel, limit, before));
                        _m.label = 6;
                    case 6: return [4 /*yield*/, _f.next()];
                    case 7:
                        if (!(_g = _m.sent(), _h = _g.done, !_h)) return [3 /*break*/, 11];
                        _k = _g.value;
                        _e = false;
                        messages = _k;
                        messageData = messages.map(function (message) { return ({
                            userId: message.author.id,
                            guildId: message.guild.id,
                            messageId: message.id,
                            channelId: message.channel.id,
                            timestamp: message.createdAt,
                        }); });
                        userData = messageData.map(function (data) { return ({ id: data.userId }); });
                        i += messageData.length;
                        return [4 /*yield*/, itx.followUp({
                                content: "Preloaded ".concat(i, "/").concat(limit, " messages. It's ").concat((i / limit) * 100, "% done. Last message: ").concat((_l = messages.last()) === null || _l === void 0 ? void 0 : _l.url),
                                flags: "Ephemeral",
                            })];
                    case 8:
                        _m.sent();
                        return [4 /*yield*/, prisma.$transaction([
                                prisma.user.createMany({ data: userData, skipDuplicates: true }),
                                prisma.userTextActivity.createMany({ data: messageData }),
                            ])];
                    case 9:
                        _m.sent();
                        _m.label = 10;
                    case 10:
                        _e = true;
                        return [3 /*break*/, 6];
                    case 11: return [3 /*break*/, 18];
                    case 12:
                        e_1_1 = _m.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 18];
                    case 13:
                        _m.trys.push([13, , 16, 17]);
                        if (!(!_e && !_h && (_j = _f.return))) return [3 /*break*/, 15];
                        return [4 /*yield*/, _j.call(_f)];
                    case 14:
                        _m.sent();
                        _m.label = 15;
                    case 15: return [3 /*break*/, 17];
                    case 16:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 17: return [7 /*endfinally*/];
                    case 18: return [2 /*return*/];
                }
            });
        }); });
    });
})
    .group("ranking", function (group) {
    return group
        .setDescription("Komendy związane z rankingami")
        .addCommand("user", function (command) {
        return command
            .setDescription("Ranking kanałów użytkownika")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addString("okres", function (period) {
            return period.setDescription("Okres czasu, np. 2025-01");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var periodStart, periodEnd, where, paginate, formatEntry, paginator;
            var prisma = _c.prisma;
            var user = _d.user, rawPeriod = _d.okres;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        periodStart = (0, dateParsing_1.parseDate)(rawPeriod, "start", null);
                        if (!!periodStart) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy okres. Przykład: 2025-01")];
                    case 1: return [2 /*return*/, _e.sent()];
                    case 2:
                        periodEnd = (0, date_fns_1.endOfMonth)(periodStart);
                        where = {
                            guildId: itx.guild.id,
                            userId: user.id,
                            timestamp: {
                                gte: periodStart,
                                lte: periodEnd,
                            },
                        };
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.userTextActivity.groupBy(__assign(__assign({}, props), { by: "channelId", where: where, _count: true, orderBy: [
                                    { _count: { channelId: ordering } },
                                    { channelId: ordering },
                                ] }));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.userTextActivity.groupBy({
                                            by: "channelId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatEntry = function (item, idx) {
                            return ("".concat(idx, "\\.") +
                                " <#".concat(item.channelId, "> - ").concat(item._count.toLocaleString("pl-PL"), " ").concat(pluralize_1.pluralizers.messages(item._count)));
                        };
                        paginator = new core_1.PaginatedView(paginate, "Ranking wiadomo\u015Bci tekstowych u\u017Cytkownika ".concat(user.tag, " (").concat(rawPeriod, ")"), formatEntry, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("kanał", function (command) {
        return command
            .setDescription("Ranking użytkowników na kanale")
            .addChannel("kanał", function (channel) {
            return channel.setDescription("Kanał").setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .addString("okres", function (period) {
            return period.setDescription("Okres czasu, np. 2025-01");
        })
            .addBoolean("medale", function (medals) {
            return medals
                .setDescription("Wyświetl medale dla pierwszych trzech miejsc")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var periodStart, periodEnd, where, paginate, formatEntry, paginator;
            var prisma = _c.prisma;
            var channel = _d.kanał, rawPeriod = _d.okres, showMedals = _d.medale;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        periodStart = (0, dateParsing_1.parseDate)(rawPeriod, "start", null);
                        if (!!periodStart) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy okres. Przykład: 2025-01")];
                    case 1: return [2 /*return*/, _e.sent()];
                    case 2:
                        periodEnd = (0, date_fns_1.endOfMonth)(periodStart);
                        where = {
                            guildId: itx.guild.id,
                            channelId: channel.id,
                            timestamp: {
                                gte: periodStart,
                                lte: periodEnd,
                            },
                        };
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.userTextActivity.groupBy(__assign(__assign({}, props), { by: "userId", where: where, _count: true, orderBy: [{ _count: { userId: ordering } }, { userId: ordering }] }));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.userTextActivity.groupBy({
                                            by: "userId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatEntry = function (item, idx) {
                            var parts = ["".concat(idx, "\\.")];
                            if (showMedals) {
                                var medal = getMedal(idx);
                                if (medal)
                                    parts.push(medal);
                            }
                            parts.push("<@".concat(item.userId, "> - ").concat(item._count.toLocaleString("pl-PL"), " ").concat(pluralize_1.pluralizers.messages(item._count)));
                            return parts.join(" ");
                        };
                        paginator = new core_1.PaginatedView(paginate, "Ranking wiadomo\u015Bci tekstowych na kanale ".concat(channel.name, " (").concat(rawPeriod, ")"), formatEntry, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("serwer", function (command) {
        return command
            .setDescription("Ranking kanałów na serwerze")
            .addString("okres", function (period) {
            return period.setDescription("Okres czasu, np. 2025-01");
        })
            .addBoolean("medale", function (medals) {
            return medals
                .setDescription("Wyświetl medale dla pierwszych trzech miejsc")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var periodStart, periodEnd, where, paginate, formatEntry, paginator;
            var prisma = _c.prisma;
            var rawPeriod = _d.okres, showMedals = _d.medale;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        periodStart = (0, dateParsing_1.parseDate)(rawPeriod, "start", null);
                        if (!!periodStart) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy okres. Przykład: 2025-01")];
                    case 1: return [2 /*return*/, _e.sent()];
                    case 2:
                        periodEnd = (0, date_fns_1.endOfMonth)(periodStart);
                        where = {
                            guildId: itx.guild.id,
                            timestamp: {
                                gte: periodStart,
                                lte: periodEnd,
                            },
                        };
                        db_1.Prisma.SortOrder;
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            var sqlOrdering = db_1.Prisma.sql([ordering]);
                            return prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n                  select\n                    \"channelId\",\n                    count(*) as \"total\",\n                    count(distinct \"userId\") as \"uniqueMembers\"\n                  from \"userTextActivity\"\n                  where\n                    \"guildId\" = ", "\n                    and \"timestamp\" between ", " and ", "\n                  group by \"channelId\"\n                  order by \"total\" ", "\n                  offset ", "\n                  limit ", ";\n                "], ["\n                  select\n                    \"channelId\",\n                    count(*) as \"total\",\n                    count(distinct \"userId\") as \"uniqueMembers\"\n                  from \"userTextActivity\"\n                  where\n                    \"guildId\" = ", "\n                    and \"timestamp\" between ", " and ", "\n                  group by \"channelId\"\n                  order by \"total\" ", "\n                  offset ", "\n                  limit ", ";\n                "])), itx.guild.id, periodStart, periodEnd, sqlOrdering, props.skip, props.take);
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.userTextActivity.groupBy({
                                            by: "channelId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatEntry = function (item, idx) {
                            var parts = ["".concat(idx, "\\.")];
                            if (showMedals) {
                                var medal = getMedal(idx);
                                if (medal)
                                    parts.push(medal);
                            }
                            parts.push("<#".concat(item.channelId, "> - ").concat(item.total.toLocaleString("pl-PL"), " ").concat(pluralize_1.pluralizers.messages(item.total)), "[".concat(item.uniqueMembers, " :busts_in_silhouette:]"));
                            return parts.join(" ");
                        };
                        paginator = new core_1.PaginatedView(paginate, "Ranking wiadomo\u015Bci tekstowych na serwerze (".concat(rawPeriod, ")"), formatEntry, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("guildMessageCreate", function (_a, message_1) { return __awaiter(void 0, [_a, message_1], void 0, function (_b, message) {
    var stickyMessageCache = _b.stickyMessageCache, userTextActivityQueue = _b.userTextActivityQueue;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                userTextActivityQueue.push(message.channel.id, {
                    user: {
                        connectOrCreate: {
                            create: { id: message.author.id },
                            where: { id: message.author.id },
                        },
                    },
                    guild: { connect: { id: message.guild.id } },
                    messageId: message.id,
                    channelId: message.channel.id,
                    timestamp: message.createdAt,
                });
                return [4 /*yield*/, handleStickyMessage(stickyMessageCache, message)];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
var templateObject_1;
