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
exports.items = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var specializedConstants_1 = require("../specializedConstants");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var util_1 = require("./util");
var formatItemInList = function (_a) {
    var id = _a.id, name = _a.name, description = _a.description, type = _a.type;
    var lines = [];
    lines.push("### ".concat(name, " [").concat(id, "] ").concat((0, util_1.getTypeNameForList)(type)));
    if (description)
        lines.push(description);
    return lines.join("\n");
};
exports.items = new core_1.Hashira({ name: "items" })
    .use(base_1.base)
    .group("item-admin", function (group) {
    return group
        .setDescription("Zarządzanie przedmiotami")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("lista", function (command) {
        return command
            .setDescription("Wyświetl listę przedmiotów")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginator, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        where = {
                            deletedAt: null,
                            guildId: itx.guildId,
                        };
                        paginator = new db_1.DatabasePaginator(function (props) { return prisma.item.findMany(__assign({ where: where }, props)); }, function () { return prisma.item.count({ where: where }); });
                        paginatedView = new core_1.PaginatedView(paginator, "Przedmioty", formatItemInList, true, "T - tytuł profilu, O - odznaka");
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("utwórz", function (command) {
        return command
            .setDescription("Utwórz nowy przedmiot")
            .addString("name", function (name) { return name.setDescription("Nazwa przedmiotu"); })
            .addString("description", function (name) { return name.setDescription("Opis przedmiotu"); })
            .addInteger("price", function (name) {
            return name
                .setDescription("Cena przedmiotu. Zostanie on automatycznie dodany do sklepu")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item, message;
            var prisma = _c.prisma;
            var name = _d.name, description = _d.description, price = _d.price;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var item;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(tx, itx.user)];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, tx.item.create({
                                                    data: {
                                                        guildId: itx.guildId,
                                                        createdBy: itx.user.id,
                                                        type: "item",
                                                        name: name,
                                                        description: description,
                                                    },
                                                })];
                                        case 2:
                                            item = _a.sent();
                                            if (!item)
                                                return [2 /*return*/, null];
                                            if (!(price !== null)) return [3 /*break*/, 4];
                                            return [4 /*yield*/, tx.shopItem.create({
                                                    data: {
                                                        item: { connect: { id: item.id } },
                                                        price: price,
                                                        creator: { connect: { id: itx.user.id } },
                                                    },
                                                })];
                                        case 3:
                                            _a.sent();
                                            _a.label = 4;
                                        case 4: return [2 /*return*/, item];
                                    }
                                });
                            }); })];
                    case 2:
                        item = _e.sent();
                        if (!item)
                            return [2 /*return*/];
                        message = "Utworzono przedmiot ".concat((0, util_1.formatItem)(item));
                        if (price !== null) {
                            message += " i dodano go do sklepu za ".concat((0, util_1.formatBalance)(price, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol));
                        }
                        return [4 /*yield*/, itx.editReply(message)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("utwórz-tytuł", function (command) {
        return command
            .setDescription("Utwórz nowy tytuł profilu")
            .addString("name", function (name) { return name.setDescription("Nazwa tytułu"); })
            .addString("description", function (description) {
            return description.setDescription("Opis tytułu").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item;
            var prisma = _c.prisma;
            var name = _d.name, description = _d.description;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                    case 2:
                        _e.sent();
                        return [4 /*yield*/, prisma.item.create({
                                data: {
                                    name: name,
                                    description: description,
                                    guildId: itx.guildId,
                                    createdBy: itx.user.id,
                                    type: "profileTitle",
                                },
                            })];
                    case 3:
                        item = _e.sent();
                        return [4 /*yield*/, itx.editReply("Utworzono tytu\u0142 ".concat((0, util_1.formatItem)(item)))];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("utwórz-odznakę", function (command) {
        return command
            .setDescription("Utwórz nową odznakę profilu")
            .addString("name", function (name) { return name.setDescription("Nazwa odznaki"); })
            .addAttachment("image", function (image) {
            return image.setDescription("Obrazek odznaki (PNG, 128x128px)");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var imageData, item, _e, _f, _g;
            var _h, _j;
            var prisma = _c.prisma;
            var name = _d.name, image = _d.image;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _k.sent();
                        if (!(image.contentType !== "image/png")) return [3 /*break*/, 3];
                        return [4 /*yield*/, itx.editReply("Obrazek odznaki musi być w formacie PNG!")];
                    case 2:
                        _k.sent();
                        return [2 /*return*/];
                    case 3:
                        if (!(image.width !== 128 || image.height !== 128)) return [3 /*break*/, 5];
                        return [4 /*yield*/, itx.editReply("Obrazek odznaki musi mieć rozmiar 128x128px!")];
                    case 4:
                        _k.sent();
                        return [2 /*return*/];
                    case 5: return [4 /*yield*/, fetch(image.url)];
                    case 6:
                        imageData = _k.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                    case 7:
                        _k.sent();
                        _f = (_e = prisma.badge).create;
                        _h = {};
                        _j = {
                            item: {
                                create: {
                                    name: name,
                                    guildId: itx.guildId,
                                    createdBy: itx.user.id,
                                    type: "badge",
                                },
                            }
                        };
                        _g = Uint8Array.bind;
                        return [4 /*yield*/, imageData.arrayBuffer()];
                    case 8: return [4 /*yield*/, _f.apply(_e, [(_h.data = (_j.image = new (_g.apply(Uint8Array, [void 0, _k.sent()]))(),
                                _j),
                                _h)])];
                    case 9:
                        item = _k.sent();
                        return [4 /*yield*/, itx.editReply("Utworzono now\u0105 odznak\u0119 ".concat((0, discord_js_1.italic)(name), " [").concat((0, discord_js_1.inlineCode)(item.id.toString()), "]"))];
                    case 10:
                        _k.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("utwórz-kolor", function (command) {
        return command
            .setDescription("Utwórz nowy kolor profilu")
            .addString("name", function (name) { return name.setDescription("Nazwa koloru"); })
            .addString("hex", function (hex) { return hex.setDescription("Hex koloru (np. #ff5632)"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var color, item;
            var prisma = _c.prisma;
            var name = _d.name, hex = _d.hex;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        color = Bun.color(hex, "number");
                        if (!!color) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podany kolor nie jest poprawny!")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                    case 4:
                        _e.sent();
                        return [4 /*yield*/, prisma.tintColor.create({
                                data: {
                                    item: {
                                        create: {
                                            name: name,
                                            guildId: itx.guildId,
                                            createdBy: itx.user.id,
                                            type: "staticTintColor",
                                        },
                                    },
                                    color: color,
                                },
                            })];
                    case 5:
                        item = _e.sent();
                        return [4 /*yield*/, itx.editReply("Utworzono nowy kolor ".concat((0, discord_js_1.italic)(name), " (").concat((0, discord_js_1.bold)(hex), ") [").concat((0, discord_js_1.inlineCode)(item.id.toString()), "]"))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edytuj", function (command) {
        return command
            .setDescription("Edytuj przedmiot")
            .addInteger("id", function (id) { return id.setDescription("ID przedmiotu"); })
            .addString("name", function (name) {
            return name.setDescription("Nowa nazwa przedmiotu").setRequired(false);
        })
            .addString("description", function (name) {
            return name.setDescription("Nowy opis przedmiotu").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item;
            var prisma = _c.prisma;
            var id = _d.id, name = _d.name, description = _d.description;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        if (!(!name && !description)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podaj przynajmniej jedną wartość do edycji")];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                    case 3: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                            var item;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, util_1.getItem)(tx, id, itx.guildId)];
                                    case 1:
                                        item = _a.sent();
                                        if (!!item) return [3 /*break*/, 3];
                                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono przedmiotu o podanym ID")];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/, null];
                                    case 3: return [4 /*yield*/, tx.item.update({
                                            where: { id: id },
                                            data: {
                                                name: name !== null && name !== void 0 ? name : item.name,
                                                description: description !== null && description !== void 0 ? description : item.description,
                                            },
                                        })];
                                    case 4:
                                        _a.sent();
                                        return [2 /*return*/, item];
                                }
                            });
                        }); })];
                    case 4:
                        item = _e.sent();
                        if (!item)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.editReply("Edytowano przedmiot ".concat((0, discord_js_1.inlineCode)(id.toString())))];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("usun", function (command) {
        return command
            .setDescription("Usuń przedmiot")
            .addInteger("id", function (id) { return id.setDescription("ID przedmiotu"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var item;
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
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var item;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, util_1.getItem)(tx, id, itx.guildId)];
                                        case 1:
                                            item = _a.sent();
                                            if (!!item) return [3 /*break*/, 3];
                                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono przedmiotu o podanym ID")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/, null];
                                        case 3: return [4 /*yield*/, tx.item.update({
                                                where: { id: id },
                                                data: { deletedAt: itx.createdAt },
                                            })];
                                        case 4:
                                            _a.sent();
                                            return [4 /*yield*/, tx.shopItem.updateMany({
                                                    where: { item: item },
                                                    data: { deletedAt: itx.createdAt },
                                                })];
                                        case 5:
                                            _a.sent();
                                            return [2 /*return*/, item];
                                    }
                                });
                            }); })];
                    case 2:
                        item = _e.sent();
                        if (!item)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.editReply("Usuni\u0119to przedmiot ".concat((0, discord_js_1.inlineCode)(id.toString())))];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
