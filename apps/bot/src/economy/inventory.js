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
exports.inventory = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var util_1 = require("./util");
var autocompleteItem = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var results;
    var prisma = _b.prisma, itx = _b.itx;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.item.findMany({
                    where: {
                        deletedAt: null,
                        guildId: itx.guildId,
                        name: {
                            contains: itx.options.getFocused(),
                            mode: "insensitive",
                        },
                    },
                })];
            case 1:
                results = _c.sent();
                return [2 /*return*/, itx.respond(results.map(function (_a) {
                        var id = _a.id, name = _a.name, type = _a.type;
                        return ({
                            value: id,
                            name: "".concat(name, " ").concat((0, util_1.getTypeNameForList)(type)),
                        });
                    }))];
        }
    });
}); };
exports.inventory = new core_1.Hashira({ name: "inventory" })
    .use(base_1.base)
    .group("eq", function (group) {
    return group
        .setDescription("Ekwipunek")
        .setDMPermission(false)
        .addCommand("user", function (command) {
        return command
            .setDescription("Wyświetl ekwipunek użytkownika")
            .addUser("user", function (user) {
            return user.setDescription("Użytkownik").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var user, items, itemNames, where, paginator, paginatedView;
            var prisma = _c.prisma;
            var rawUser = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        user = rawUser !== null && rawUser !== void 0 ? rawUser : itx.user;
                        return [4 /*yield*/, prisma.item.findMany({
                                where: { guildId: itx.guildId },
                                select: { id: true, name: true },
                            })];
                    case 2:
                        items = _e.sent();
                        itemNames = new Map(items.map(function (item) { return [item.id, item.name]; }));
                        where = {
                            item: { guildId: itx.guildId },
                            userId: user.id,
                            deletedAt: null,
                        };
                        paginator = new db_1.DatabasePaginator(function (props, ordering) {
                            return prisma.inventoryItem.groupBy(__assign({ by: "itemId", where: where, _count: true, orderBy: [{ _count: { itemId: ordering } }, { itemId: ordering }] }, props));
                        }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.inventoryItem.groupBy({
                                            by: "itemId",
                                            where: where,
                                        })];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, count.length];
                                }
                            });
                        }); });
                        paginatedView = new core_1.PaginatedView(paginator, "Ekwipunek ".concat(user.tag), function (_a) {
                            var _b;
                            var _count = _a._count, itemId = _a.itemId;
                            var idString = "[".concat((0, discord_js_1.inlineCode)(itemId.toString()), "]");
                            var itemName = (_b = itemNames.get(itemId)) !== null && _b !== void 0 ? _b : "Nieznany przedmiot";
                            if (_count === 1)
                                return "- ".concat(itemName, " ").concat(idString);
                            return "- ".concat(itemName, " (x").concat((0, discord_js_1.bold)(_count.toString()), ") ").concat(idString);
                        }, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("przekaz", function (command) {
        return command
            .setDescription("Przekaż przedmiot innemu użytkownikowi")
            .addInteger("id", function (id) { return id.setDescription("ID przedmiotu"); })
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item, dialog;
            var prisma = _c.prisma, lock = _c.lock, economyLog = _c.economyLog;
            var itemId = _d.id, targetUser = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        if (!(targetUser.id === itx.user.id)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie możesz przekazać przedmiotu samemu sobie!")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3: return [4 /*yield*/, prisma.item.findFirst({
                            where: {
                                id: itemId,
                                deletedAt: null,
                                guildId: itx.guildId,
                                type: "item",
                            },
                        })];
                    case 4:
                        item = _e.sent();
                        if (!!item) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Przedmiot o podanym ID nie istnieje lub nie możesz go przekazać!")];
                    case 5: return [2 /*return*/, _e.sent()];
                    case 6: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [targetUser, itx.user])];
                    case 7:
                        _e.sent();
                        dialog = new core_1.ConfirmationDialog("Czy na pewno chcesz przekaza\u0107 ".concat((0, discord_js_1.bold)(item.name), " [").concat((0, discord_js_1.inlineCode)(itemId.toString()), "] dla ").concat((0, discord_js_1.bold)(targetUser.tag), "?"), "Tak", "Nie", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var inventoryItem;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                            var inventoryItem;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, (0, util_1.getInventoryItem)(tx, itemId, itx.guildId, itx.user.id)];
                                                    case 1:
                                                        inventoryItem = _a.sent();
                                                        if (!!inventoryItem) return [3 /*break*/, 3];
                                                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie posiadasz ".concat((0, discord_js_1.bold)(item.name)))];
                                                    case 2:
                                                        _a.sent();
                                                        return [2 /*return*/, null];
                                                    case 3: return [4 /*yield*/, tx.inventoryItem.update({
                                                            where: { id: inventoryItem.id },
                                                            data: { userId: targetUser.id },
                                                        })];
                                                    case 4:
                                                        _a.sent();
                                                        return [2 /*return*/, inventoryItem];
                                                }
                                            });
                                        }); })];
                                    case 1:
                                        inventoryItem = _a.sent();
                                        if (!inventoryItem)
                                            return [2 /*return*/];
                                        return [4 /*yield*/, itx.editReply({
                                                content: "Przekazano ".concat((0, discord_js_1.bold)(item.name), " dla ").concat((0, discord_js_1.bold)(targetUser.tag)),
                                                components: [],
                                            })];
                                    case 2:
                                        _a.sent();
                                        economyLog.push("itemTransfer", itx.guild, {
                                            fromUser: itx.user,
                                            toUser: targetUser,
                                            item: item,
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, itx.editReply({
                                            content: "Anulowano przekazywanie przedmiotu.",
                                            components: [],
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function (action) { return action.user.id === itx.user.id; });
                        return [4 /*yield*/, lock.run(["inventory_item_transfer_".concat(itx.guildId, "_").concat(itx.user.id, "_").concat(itemId)], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, dialog.render({ send: itx.editReply.bind(itx) })];
                            }); }); }, function () {
                                return (0, errorFollowUp_1.errorFollowUp)(itx, "Jesteś już w trakcie przekazania tego przedmiotu!");
                            })];
                    case 8:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .group("eq-admin", function (group) {
    return group
        .setDescription("Komendy administracyjne ekwipunków")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("dodaj", function (command) {
        return command
            .setDescription("Dodaj przedmiot do ekwipunku użytkownika")
            .addInteger("przedmiot", function (id) {
            return id.setDescription("Przedmiot").setAutocomplete(true);
        })
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [2 /*return*/, autocompleteItem({ prisma: prisma, itx: itx })];
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item;
            var prisma = _c.prisma, economyLog = _c.economyLog;
            var itemId = _d.przedmiot, user = _d.user;
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
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var item;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, util_1.getItem)(tx, itemId, itx.guildId)];
                                        case 1:
                                            item = _a.sent();
                                            if (!!item) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Przedmiot o podanym ID nie istnieje")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/, null];
                                        case 3: return [4 /*yield*/, tx.inventoryItem.create({
                                                data: {
                                                    itemId: itemId,
                                                    userId: user.id,
                                                },
                                            })];
                                        case 4:
                                            _a.sent();
                                            return [2 /*return*/, item];
                                    }
                                });
                            }); })];
                    case 3:
                        item = _e.sent();
                        if (!item)
                            return [2 /*return*/];
                        economyLog.push("itemAddToInventory", itx.guild, {
                            moderator: itx.user,
                            user: user,
                            item: item,
                        });
                        return [4 /*yield*/, itx.editReply("Dodano ".concat((0, discord_js_1.bold)(item.name), " ").concat((0, util_1.getTypeNameForList)(item.type), " do ekwipunku ").concat((0, discord_js_1.bold)(user.tag)))];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("zabierz", function (command) {
        return command
            .setDescription("Zabierz przedmiot z ekwipunku użytkownika")
            .addInteger("przedmiot", function (id) {
            return id.setDescription("Przedmiot").setAutocomplete(true);
        })
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [2 /*return*/, autocompleteItem({ prisma: prisma, itx: itx })];
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item;
            var prisma = _c.prisma, economyLog = _c.economyLog;
            var itemId = _d.przedmiot, user = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var item, inventoryItem;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, util_1.getItem)(prisma, itemId, itx.guildId)];
                                        case 1:
                                            item = _a.sent();
                                            if (!!item) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Przedmiot o podanym ID nie istnieje")];
                                        case 2: return [2 /*return*/, _a.sent()];
                                        case 3: return [4 /*yield*/, (0, util_1.getInventoryItem)(tx, itemId, itx.guildId, user.id)];
                                        case 4:
                                            inventoryItem = _a.sent();
                                            if (!!inventoryItem) return [3 /*break*/, 6];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "".concat((0, discord_js_1.bold)(user.tag), " nie posiada ").concat((0, discord_js_1.bold)(item.name)))];
                                        case 5:
                                            _a.sent();
                                            return [2 /*return*/, null];
                                        case 6: return [4 /*yield*/, tx.inventoryItem.update({
                                                where: { id: inventoryItem.id, deletedAt: null },
                                                data: { deletedAt: itx.createdAt },
                                            })];
                                        case 7:
                                            _a.sent();
                                            return [2 /*return*/, item];
                                    }
                                });
                            }); })];
                    case 2:
                        item = _e.sent();
                        if (!item)
                            return [2 /*return*/];
                        economyLog.push("itemRemoveFromInventory", itx.guild, {
                            moderator: itx.user,
                            user: user,
                            item: item,
                        });
                        return [4 /*yield*/, itx.editReply("Usuni\u0119to ".concat((0, discord_js_1.bold)(item.name), " z ekwipunku ").concat((0, discord_js_1.bold)(user.tag), "."))];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
