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
exports.currency = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var formatCurrency = function (_a, showOwner) {
    var name = _a.name, symbol = _a.symbol, createdAt = _a.createdAt, createdBy = _a.createdBy;
    if (showOwner === void 0) { showOwner = false; }
    var formattedTime = (0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.LongDateTime);
    var base = "".concat(name, " - ").concat(symbol, " - ").concat(formattedTime);
    return showOwner ? "".concat(base, " - <@").concat(createdBy, ">") : base;
};
exports.currency = new core_1.Hashira({ name: "currency" })
    .use(base_1.base)
    .group("currency", function (group) {
    return group
        .setDMPermission(false)
        .setDescription("Currency related commands")
        .addCommand("create", function (createCommand) {
        return createCommand
            .setDescription("Create a new currency")
            .addString("name", function (nameOption) {
            return nameOption.setDescription("The name of the currency");
        })
            .addString("symbol", function (symbolOption) {
            return symbolOption.setDescription("The symbol of the currency");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var err_1;
            var prisma = _c.prisma;
            var name = _d.name, symbol = _d.symbol;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!!itx.memberPermissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers)) return [3 /*break*/, 2];
                        return [4 /*yield*/, itx.reply("You don't have permission to create a currency!")];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                    case 2:
                        _e.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, prisma.currency.create({
                                data: {
                                    name: name,
                                    symbol: symbol,
                                    guildId: itx.guildId,
                                    createdBy: itx.user.id,
                                },
                            })];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        err_1 = _e.sent();
                        return [4 /*yield*/, itx.reply("Currency with the same name or symbol already exists!")];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                    case 6: return [4 /*yield*/, itx.reply("Currency created successfully!")];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addGroup("list", function (listGroup) {
        return listGroup
            .setDescription("Commands to list currencies")
            .addCommand("user", function (userCommand) {
            return userCommand
                .setDescription("List all currencies of certain user")
                .addUser("user", function (userOption) {
                return userOption
                    .setDescription("The user to get stats for")
                    .setRequired(false);
            })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var userId, guildId, where, paginate, paginator;
                var _e;
                var prisma = _c.prisma;
                var user = _d.user;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            userId = (_e = user === null || user === void 0 ? void 0 : user.id) !== null && _e !== void 0 ? _e : itx.user.id;
                            guildId = itx.guildId;
                            where = { createdBy: userId, guildId: guildId };
                            paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                                return prisma.currency.findMany(__assign(__assign({}, props), { where: where, orderBy: { createdAt: createdAt } }));
                            }, function () { return prisma.currency.count({ where: where }); });
                            paginator = new core_1.PaginatedView(paginate, "Currencies", function (item, idx) { return "".concat(idx, ". ").concat(formatCurrency(item)); });
                            return [4 /*yield*/, paginator.render(itx)];
                        case 1:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("guild", function (guildCommand) {
            return guildCommand
                .setDescription("List all currencies of current guild")
                .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var where, paginate, paginator;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            where = { guildId: itx.guildId };
                            paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                                return prisma.currency.findMany(__assign(__assign({}, props), { where: where, orderBy: { createdAt: createdAt } }));
                            }, function () { return prisma.currency.count({ where: where }); });
                            paginator = new core_1.PaginatedView(paginate, "Currencies", function (item, idx) { return "".concat(idx, ". ").concat(formatCurrency(item, true)); });
                            return [4 /*yield*/, paginator.render(itx)];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
});
