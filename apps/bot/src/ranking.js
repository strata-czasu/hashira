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
exports.ranking = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var dateParsing_1 = require("./util/dateParsing");
var errorFollowUp_1 = require("./util/errorFollowUp");
var pluralize_1 = require("./util/pluralize");
exports.ranking = new core_1.Hashira({ name: "ranking" })
    .use(base_1.base)
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
                        }); }, { pageSize: 30, defaultOrder: paginate_1.PaginatorOrder.DESC });
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
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var periodStart, periodEnd, where, paginate, formatEntry, paginator;
            var prisma = _c.prisma;
            var channel = _d.kanał, rawPeriod = _d.okres;
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
                        }); }, { pageSize: 30, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatEntry = function (item, idx) {
                            return ("".concat(idx, "\\.") +
                                " <@".concat(item.userId, "> - ").concat(item._count.toLocaleString("pl-PL"), " ").concat(pluralize_1.pluralizers.messages(item._count)));
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
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var periodStart, periodEnd, where, paginate, formatEntry, paginator;
            var prisma = _c.prisma;
            var rawPeriod = _d.okres;
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
                        }); }, { pageSize: 30, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatEntry = function (item, idx) {
                            return ("".concat(idx, "\\.") +
                                " <#".concat(item.channelId, "> - ").concat(item.total.toLocaleString("pl-PL"), " ").concat(pluralize_1.pluralizers.messages(item.total)) +
                                " [".concat(item.uniqueMembers, " :busts_in_silhouette:]"));
                        };
                        paginator = new core_1.PaginatedView(paginate, "Ranking wiadomo\u015Bci tekstowych na serwerze (".concat(rawPeriod, ")"), formatEntry, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("wedka", function (command) {
        return command
            .setDescription("Ranking wędkarzy")
            .addString("okres", function (period) {
            return period.setDescription("Okres czasu, np. 2025-01").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var periodWhere, periodStart, periodEnd, where, paginate, wallets, walletToUserId, titleParts, paginator;
            var prisma = _c.prisma;
            var rawPeriod = _d.okres;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        periodWhere = {};
                        if (!rawPeriod) return [3 /*break*/, 3];
                        periodStart = (0, dateParsing_1.parseDate)(rawPeriod, "start", null);
                        if (!!periodStart) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy okres. Przykład: 2025-01")];
                    case 1: return [2 /*return*/, _e.sent()];
                    case 2:
                        periodEnd = (0, date_fns_1.endOfMonth)(periodStart);
                        periodWhere.createdAt = {
                            gte: periodStart,
                            lte: periodEnd,
                        };
                        _e.label = 3;
                    case 3:
                        where = __assign({ wallet: { guildId: itx.guild.id }, reason: { startsWith: "Łowienie" }, transactionType: "add", entryType: "credit" }, periodWhere);
                        paginate = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.transaction.groupBy(__assign(__assign({}, props), { by: "walletId", where: where, _count: true, _sum: { amount: true }, orderBy: [{ _sum: { amount: ordering } }, { walletId: ordering }] }));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.transaction.groupBy({
                                            by: "walletId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); }, { pageSize: 30, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        return [4 /*yield*/, prisma.wallet.findMany({
                                where: { guildId: itx.guild.id },
                                select: { id: true, userId: true },
                            })];
                    case 4:
                        wallets = _e.sent();
                        walletToUserId = new Map(wallets.map(function (wallet) { return [wallet.id, wallet.userId]; }));
                        titleParts = ["Ranking wędkarzy"];
                        if (rawPeriod)
                            titleParts.push("(".concat(rawPeriod, ")"));
                        paginator = new core_1.PaginatedView(paginate, titleParts.join(" "), function (item, idx) {
                            var _a;
                            var amountSum = (_a = item._sum.amount) !== null && _a !== void 0 ? _a : 0;
                            var userId = walletToUserId.get(item.walletId);
                            return ("".concat(idx, "\\.") +
                                " <@".concat(userId, "> - ").concat(amountSum.toLocaleString("pl-PL"), " ").concat(pluralize_1.pluralizers.points(amountSum), " ") +
                                "[".concat(item._count, " :fishing_pole_and_fish:]"));
                        }, true);
                        return [4 /*yield*/, paginator.render(itx)];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
var templateObject_1;
