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
exports.colorRoles = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var preprocessColor = function (color) {
    if (color.startsWith("#")) {
        return color;
    }
    return "#".concat(color);
};
var getColor = function (rawColor) {
    var color = typeof rawColor === "string" ? preprocessColor(rawColor) : rawColor;
    try {
        return (0, discord_js_1.resolveColor)(color);
    }
    catch (err) {
        return null;
    }
};
var readExpiration = function (expiration) {
    var now = new Date();
    switch (expiration) {
        case "1d":
            return (0, date_fns_1.addDays)(now, 1);
        case "1w":
            return (0, date_fns_1.addWeeks)(now, 1);
        case "1m":
            return (0, date_fns_1.addMonths)(now, 1);
        case "3m":
            return (0, date_fns_1.addMonths)(now, 3);
        case "6m":
            return (0, date_fns_1.addMonths)(now, 6);
        case "1y":
            return (0, date_fns_1.addYears)(now, 1);
        default:
            return null;
    }
};
exports.colorRoles = new core_1.Hashira({ name: "color-role" })
    .use(base_1.base)
    .group("kolorki", function (group) {
    return group
        .setDescription("Zarządzaj swoimi kolorkami")
        .addCommand("dodaj", function (command) {
        return command
            .setDescription("[MODERACYJNE] Dodaj nowy kolor")
            .addString("nazwa", function (name) { return name.setDescription("Nazwa koloru"); })
            .addUser("właściciel", function (owner) { return owner.setDescription("Właściciel koloru"); })
            .addString("wygaśnięcie", function (expiration) {
            return expiration
                .setDescription("Czas po którym kolor wygaśnie")
                .addChoices({ name: "Bez wygaśnięcia", value: "0" }, { name: "1 dzień", value: "1d" }, { name: "1 tydzień", value: "1w" }, { name: "1 miesiąc", value: "1m" }, { name: "3 miesiące", value: "3m" }, { name: "6 miesięcy", value: "6m" }, { name: "1 rok", value: "1y" });
        })
            .addInteger("sloty", function (slots) {
            return slots.setDescription("Ilość slotów na użytkowników").addChoices({
                name: "1",
                value: 1,
            }, { name: "10", value: 10 });
        })
            .addBoolean("gradient", function (gradient) {
            return gradient.setDescription("Czy kolor roli może używać gradientów");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var expiration, role, member, expirationText;
            var prisma = _c.prisma;
            var name = _d.nazwa, owner = _d.właściciel, rawExpiration = _d.wygaśnięcie, slots = _d.sloty, gradient = _d.gradient;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!itx.memberPermissions.has(discord_js_1.PermissionFlagsBits.ManageRoles))
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        expiration = readExpiration(rawExpiration);
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return itx.guild.roles.create({ name: name, color: 0x000000 }); }, [
                                discord_js_1.RESTJSONErrorCodes.MissingPermissions,
                                discord_js_1.RESTJSONErrorCodes.MaximumNumberOfGuildRolesReached,
                            ], function (e) { return __awaiter(void 0, void 0, void 0, function () {
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = e.code;
                                            switch (_a) {
                                                case discord_js_1.RESTJSONErrorCodes.MissingPermissions: return [3 /*break*/, 1];
                                                case discord_js_1.RESTJSONErrorCodes.MaximumNumberOfGuildRolesReached: return [3 /*break*/, 3];
                                            }
                                            return [3 /*break*/, 5];
                                        case 1: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Missing permissions")];
                                        case 2:
                                            _b.sent();
                                            return [2 /*return*/, null];
                                        case 3: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Maximum number of roles reached (250)")];
                                        case 4:
                                            _b.sent();
                                            return [2 /*return*/, null];
                                        case 5: return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Failed to create role")];
                                        case 6:
                                            _b.sent();
                                            return [2 /*return*/, null];
                                    }
                                });
                            }); })];
                    case 2:
                        role = _e.sent();
                        if (!role)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, owner.id)];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, prisma.colorRole.create({
                                data: {
                                    name: name,
                                    ownerId: owner.id,
                                    guildId: itx.guildId,
                                    expiration: expiration,
                                    roleId: role.id,
                                    slots: slots,
                                    gradient: gradient,
                                },
                            })];
                    case 4:
                        _e.sent();
                        return [4 /*yield*/, itx.guild.members.fetch(owner.id)];
                    case 5:
                        member = _e.sent();
                        return [4 /*yield*/, member.roles.add(role.id, "Utworzenie koloru")];
                    case 6:
                        _e.sent();
                        expirationText = expiration
                            ? (0, discord_js_1.time)(expiration)
                            : (0, discord_js_1.inlineCode)("nigdy");
                        return [4 /*yield*/, itx.editReply({
                                content: "Dodano kolor ".concat(name, " dla ").concat(owner.tag, ", kt\u00F3ry wyga\u015Bnie: ").concat(expirationText),
                            })];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("przypisz", function (command) {
        return command
            .setDescription("[MODERACYJNE] Dodaj do bazy istniejący kolor")
            .addRole("rola", function (role) {
            return role.setDescription("Rola do dodania").setRequired(true);
        })
            .addUser("właściciel", function (owner) { return owner.setDescription("Właściciel koloru"); })
            .addInteger("sloty", function (slots) {
            return slots.setDescription("Ilość slotów na użytkowników");
        })
            .addBoolean("gradient", function (gradient) {
            return gradient
                .setDescription("Czy kolor roli może używać gradientów")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var colorRole, confirmation;
            var prisma = _c.prisma;
            var role = _d.rola, owner = _d.właściciel, slots = _d.sloty, gradient = _d.gradient;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        if (!itx.memberPermissions.has(discord_js_1.PermissionFlagsBits.ManageRoles))
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.colorRole.findFirst({
                                where: {
                                    guildId: itx.guildId,
                                    roleId: role.id,
                                },
                            })];
                    case 2:
                        colorRole = _e.sent();
                        if (!colorRole) return [3 /*break*/, 4];
                        confirmation = new core_1.ConfirmationDialog("Rola jest już przypisana, czy chcesz ją nadpisać?", "Nadpisz", "Anuluj", function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.colorRole.update({
                                            where: { id: colorRole.id },
                                            data: __assign({ ownerId: owner.id, slots: slots }, (gradient !== null ? { gradient: gradient } : {})),
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, itx.followUp("Nadpisano kolor ".concat(role.name, " dla ").concat(owner.tag))];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/];
                        }); }); }, function (buttonItx) { return buttonItx.user.id === itx.user.id; });
                        return [4 /*yield*/, confirmation.render({ send: itx.editReply.bind(itx) })];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, owner.id)];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, prisma.colorRole.create({
                                data: {
                                    name: role.name,
                                    ownerId: owner.id,
                                    guildId: itx.guildId,
                                    roleId: role.id,
                                    slots: slots,
                                },
                            })];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, itx.guild.members.addRole({ user: owner.id, role: role.id })];
                    case 7:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: "Dodano kolor ".concat(role.name, " dla ").concat(owner.tag),
                            })];
                    case 8:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("hex", function (command) {
        return command
            .setDescription("Ustaw kolor roli na podstawie hexa")
            .addRole("rola", function (role) {
            return role.setDescription("Rola której kolor zmienić").setRequired(true);
        })
            .addString("kolor", function (primaryColor) {
            return primaryColor.setDescription("Hex jaki ustawić").setRequired(true);
        })
            .addString("kolor2", function (secondaryColor) {
            return secondaryColor
                .setDescription("Drugi kolor do gradientu (jeśli rola może ich używać)")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var primaryColor, colorRole, newColors, secondaryColor, result, colorStrings;
            var prisma = _c.prisma;
            var role = _d.rola, rawPrimaryColor = _d.kolor, rawSecondaryColor = _d.kolor2;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        primaryColor = getColor(rawPrimaryColor);
                        if (!!primaryColor) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Niepoprawny kolor: ".concat(rawPrimaryColor))];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3: return [4 /*yield*/, prisma.colorRole.findFirst({
                            where: {
                                ownerId: itx.user.id,
                                guildId: itx.guildId,
                                roleId: role.id,
                            },
                        })];
                    case 4:
                        colorRole = _e.sent();
                        if (!!colorRole) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie jesteś właścicielem tej roli")];
                    case 5: return [2 /*return*/, _e.sent()];
                    case 6:
                        newColors = { primaryColor: primaryColor };
                        if (!rawSecondaryColor) return [3 /*break*/, 11];
                        if (!!colorRole.gradient) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ta rola nie może używać gradientów")];
                    case 7: return [2 /*return*/, _e.sent()];
                    case 8:
                        secondaryColor = getColor(rawSecondaryColor);
                        if (!!secondaryColor) return [3 /*break*/, 10];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Niepoprawny kolor: ".concat(rawSecondaryColor))];
                    case 9: return [2 /*return*/, _e.sent()];
                    case 10:
                        newColors.secondaryColor = secondaryColor;
                        _e.label = 11;
                    case 11: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return role.setColors(newColors); }, [discord_js_1.RESTJSONErrorCodes.MissingPermissions], function () { return (0, errorFollowUp_1.errorFollowUp)(itx, "Missing permissions"); })];
                    case 12:
                        result = _e.sent();
                        if (!result) return [3 /*break*/, 14];
                        colorStrings = ["#".concat(primaryColor.toString(16))];
                        if (newColors.secondaryColor) {
                            colorStrings.push("#".concat(newColors.secondaryColor.toString(16)));
                        }
                        return [4 /*yield*/, itx.editReply({
                                content: "Zmieniono kolor roli ".concat(role.name, " na ").concat(colorStrings.join(" -> "), "}"),
                            })];
                    case 13:
                        _e.sent();
                        _e.label = 14;
                    case 14: return [2 /*return*/];
                }
            });
        }); });
    });
});
