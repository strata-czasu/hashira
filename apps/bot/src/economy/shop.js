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
exports.shop = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var transaction_1 = require("@hashira/db/transaction");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var specializedConstants_1 = require("../specializedConstants");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var transferManager_1 = require("./managers/transferManager");
var walletManager_1 = require("./managers/walletManager");
var util_1 = require("./util");
/**
 * Format amount to K/M, keeping up to one decimal if needed
 */
var formatAmount = function (amount) {
    var divideAndRound = function (num, divisor) {
        var divided = num / divisor;
        return divided % 1 ? divided.toFixed(1) : divided.toFixed(0);
    };
    if (amount >= 1000000)
        return "".concat(divideAndRound(amount, 1000000), "M");
    if (amount >= 1000)
        return "".concat(divideAndRound(amount, 1000), "K");
    return divideAndRound(amount, 1);
};
exports.shop = new core_1.Hashira({ name: "shop" })
    .use(base_1.base)
    .group("sklep", function (group) {
    return group
        .setDescription("Komendy sklepu")
        .setDMPermission(false)
        .addCommand("lista", function (command) {
        return command
            .setDescription("Wyświetl listę przedmiotów w sklepie")
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
                        paginator = new db_1.DatabasePaginator(function (props, price) {
                            return prisma.shopItem.findMany(__assign(__assign({}, props), { orderBy: { price: price }, include: { item: true } }));
                        }, function () { return prisma.shopItem.count(); });
                        paginatedView = new core_1.PaginatedView(paginator, "Sklep", function (_a) {
                            var id = _a.id, price = _a.price, _b = _a.item, name = _b.name, description = _b.description, type = _b.type;
                            var lines = [];
                            lines.push("### ".concat(name, " - ").concat(formatAmount(price), " [").concat(id, "] ").concat((0, util_1.getTypeNameForList)(type)));
                            if (description)
                                lines.push(description);
                            return lines.join("\n");
                        }, true, "T - tytuł profilu");
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("kup", function (command) {
        return command
            .setDescription("Kup przedmiot ze sklepu")
            .addInteger("przedmiot", function (przedmiot) {
            return przedmiot.setDescription("Przedmiotu ze sklepu").setAutocomplete(true);
        })
            .addInteger("ilość", function (amount) {
            return amount
                .setDescription("Ilość przedmiotów")
                .setRequired(false)
                .setMinValue(1);
        })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var results;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.shopItem.findMany({
                            where: {
                                deletedAt: null,
                                item: {
                                    name: {
                                        contains: itx.options.getFocused(),
                                        mode: "insensitive",
                                    },
                                },
                            },
                            include: { item: true },
                        })];
                    case 1:
                        results = _c.sent();
                        return [4 /*yield*/, itx.respond(results.map(function (_a) {
                                var id = _a.id, price = _a.price, item = _a.item;
                                return ({
                                    value: id,
                                    name: "".concat(item.name, " - ").concat(formatAmount(price), " ").concat((0, util_1.getTypeNameForList)(item.type)),
                                });
                            }))];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var amount, success;
            var prisma = _c.prisma;
            var id = _d.przedmiot, rawAmount = _d.ilość;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user.id)];
                    case 2:
                        _e.sent();
                        amount = rawAmount !== null && rawAmount !== void 0 ? rawAmount : 1;
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var shopItem, allItemsPrice, wallet, missing, items;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, util_1.getShopItem)(tx, id)];
                                        case 1:
                                            shopItem = _a.sent();
                                            if (!!shopItem) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono przedmiotu o podanym ID w sklepie")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/, false];
                                        case 3:
                                            allItemsPrice = shopItem.price * amount;
                                            return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                                                    prisma: (0, transaction_1.nestedTransaction)(tx),
                                                    userId: itx.user.id,
                                                    guildId: itx.guild.id,
                                                    currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                                                })];
                                        case 4:
                                            wallet = _a.sent();
                                            if (!(wallet.balance < allItemsPrice)) return [3 /*break*/, 6];
                                            missing = allItemsPrice - wallet.balance;
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie masz wystarczaj\u0105co punkt\u00F3w. Brakuje Ci ".concat((0, util_1.formatBalance)(missing, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol)))];
                                        case 5:
                                            _a.sent();
                                            return [2 /*return*/, false];
                                        case 6: return [4 /*yield*/, (0, transferManager_1.addBalance)({
                                                prisma: (0, transaction_1.nestedTransaction)(tx),
                                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                                                guildId: itx.guild.id,
                                                toUserId: itx.user.id,
                                                amount: -allItemsPrice,
                                                reason: "Zakup przedmiotu ".concat(shopItem.id),
                                            })];
                                        case 7:
                                            _a.sent();
                                            items = new Array(amount).fill({ itemId: shopItem.itemId, userId: itx.user.id });
                                            return [4 /*yield*/, tx.inventoryItem.createMany({ data: items })];
                                        case 8:
                                            _a.sent();
                                            return [2 /*return*/, true];
                                    }
                                });
                            }); })];
                    case 3:
                        success = _e.sent();
                        if (!success)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.editReply("Kupiono przedmiot ze sklepu")];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .group("sklep-admin", function (group) {
    return group
        .setDescription("Zarządzanie sklepem")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("wystaw", function (command) {
        return command
            .setDescription("Wystaw przedmiot w sklepie")
            .addInteger("id", function (id) { return id.setDescription("ID przedmiotu"); })
            .addInteger("price", function (price) { return price.setDescription("Cena przedmiotu"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item;
            var prisma = _c.prisma;
            var id = _d.id, price = _d.price;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, util_1.getItem)(prisma, id)];
                    case 2:
                        item = _e.sent();
                        if (!!item) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono przedmiotu o podanym ID")];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, prisma.shopItem.create({
                            data: {
                                itemId: id,
                                price: price,
                                createdBy: itx.user.id,
                            },
                        })];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Wystawiono ".concat((0, util_1.formatItem)(item), " za ").concat((0, util_1.formatBalance)(price, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol)))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("usuń", function (command) {
        return command
            .setDescription("Usuń przedmiot ze sklepu")
            .addInteger("id", function (id) { return id.setDescription("ID przedmiotu w sklepie"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var shopItem;
            var prisma = _c.prisma;
            var id = _d.id;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, util_1.getShopItem)(prisma, id)];
                    case 2:
                        shopItem = _e.sent();
                        if (!!shopItem) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono przedmiotu w sklepie o podanym ID")];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, prisma.shopItem.update({
                            where: { id: id },
                            data: { deletedAt: itx.createdAt },
                        })];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Usuni\u0119to ".concat((0, util_1.formatItem)(shopItem.item), " ze sklepu"))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edytuj", function (command) {
        return command
            .setDescription("Zmień cenę przedmiotu w sklepie")
            .addInteger("id", function (id) { return id.setDescription("ID przedmiotu w sklepie"); })
            .addInteger("price", function (price) { return price.setDescription("Nowa cena przedmiotu"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var shopItem;
            var prisma = _c.prisma;
            var id = _d.id, price = _d.price;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, util_1.getShopItem)(prisma, id)];
                    case 2:
                        shopItem = _e.sent();
                        if (!!shopItem) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono przedmiotu w sklepie o podanym ID")];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, prisma.shopItem.update({
                            where: { id: id },
                            data: { price: price, editedAt: itx.createdAt },
                        })];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Zmieniono cen\u0119 ".concat((0, util_1.formatItem)(shopItem.item), " na ").concat((0, util_1.formatBalance)(price, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol)))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
