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
exports.profile = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var cheerio = require("cheerio");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var walletManager_1 = require("../economy/managers/walletManager");
var util_1 = require("../economy/util");
var specializedConstants_1 = require("../specializedConstants");
var util_2 = require("../userActivity/util");
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var imageBuilder_1 = require("./imageBuilder");
var marriage_1 = require("./marriage");
function fetchAsBuffer(url) {
    return __awaiter(this, void 0, void 0, function () {
        var res, arrbuf;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url)];
                case 1:
                    res = _a.sent();
                    if (!res.ok) {
                        throw new Error("Failed to fetch image from ".concat(url));
                    }
                    if (res.headers.get("content-type") !== "image/png") {
                        throw new Error("Invalid content type: ".concat(res.headers.get("content-type")));
                    }
                    return [4 /*yield*/, res.arrayBuffer()];
                case 2:
                    arrbuf = _a.sent();
                    return [2 /*return*/, Buffer.from(arrbuf)];
            }
        });
    });
}
function getUserAccesses(prisma, guildId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var ownedItems;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.inventoryItem.findMany({
                        where: {
                            userId: userId,
                            deletedAt: null,
                            item: {
                                guildId: guildId,
                                type: {
                                    in: ["dynamicTintColorAccess", "customTintColorAccess"],
                                },
                            },
                        },
                        select: {
                            item: {
                                select: {
                                    type: true,
                                },
                            },
                        },
                    })];
                case 1:
                    ownedItems = _a.sent();
                    return [2 /*return*/, ownedItems.map(function (_a) {
                            var item = _a.item;
                            return item.type;
                        })];
            }
        });
    });
}
exports.profile = new core_1.Hashira({ name: "profile" })
    .use(base_1.base)
    .use(marriage_1.marriage)
    .group("profil", function (group) {
    return group
        .setDescription("Profil")
        .setDMPermission(false)
        .addCommand("user", function (command) {
        return command
            .setDescription("Wyświetl profil użytkownika")
            .addUser("user", function (user) {
            return user.setDescription("Użytkownik").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var user, dbUser, wallet, formattedBalance, activitySince, textActivity, voiceActivitySeconds, embed, file, svg, _e, _f, image, voiceActivityHours, member, avatarImageURL, _g, _h, spouse, marriedDays, spouseAvatarImageURL, _j, _k, displayedBadges, _i, displayedBadges_1, _l, row, col, badge, attachment, e_1;
            var _m, _o, _p, _q, _r, _s;
            var prisma = _c.prisma;
            var rawUser = _d.user;
            return __generator(this, function (_t) {
                switch (_t.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        user = rawUser !== null && rawUser !== void 0 ? rawUser : itx.user;
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, user.id)];
                    case 1:
                        _t.sent();
                        return [4 /*yield*/, prisma.user.findFirst({
                                where: {
                                    id: user.id,
                                },
                                include: {
                                    inventoryItems: true,
                                    profileSettings: {
                                        include: {
                                            title: true,
                                            tintColor: true,
                                        },
                                    },
                                },
                            })];
                    case 2:
                        dbUser = _t.sent();
                        if (!dbUser)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 3:
                        _t.sent();
                        return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                                prisma: prisma,
                                userId: user.id,
                                guildId: itx.guildId,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            })];
                    case 4:
                        wallet = _t.sent();
                        formattedBalance = (0, util_1.formatBalance)(wallet.balance, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                        activitySince = (0, date_fns_1.sub)(itx.createdAt, { days: 30 });
                        return [4 /*yield*/, (0, util_2.getUserTextActivity)({
                                prisma: prisma,
                                guildId: itx.guildId,
                                userId: user.id,
                                since: activitySince,
                            })];
                    case 5:
                        textActivity = _t.sent();
                        return [4 /*yield*/, (0, util_2.getUserVoiceActivity)({
                                prisma: prisma,
                                guildId: itx.guildId,
                                userId: user.id,
                                since: activitySince,
                            })];
                    case 6:
                        voiceActivitySeconds = _t.sent();
                        embed = new discord_js_1.EmbedBuilder()
                            .setTitle("Profil ".concat(user.tag))
                            .setThumbnail(user.displayAvatarURL({ size: 256 }))
                            .addFields({
                            name: "Stan konta",
                            value: formattedBalance,
                            inline: true,
                        }, {
                            name: "Data utworzenia konta",
                            value: (0, discord_js_1.time)(user.createdAt, discord_js_1.TimestampStyles.LongDate),
                            inline: true,
                        })
                            .setFooter({ text: "ID: ".concat(user.id) });
                        file = Bun.file("".concat(__dirname, "/res/profile.svg"));
                        _f = (_e = cheerio).load;
                        return [4 /*yield*/, file.text()];
                    case 7:
                        svg = _f.apply(_e, [_t.sent()]);
                        image = new imageBuilder_1.ProfileImageBuilder(svg);
                        image
                            .nickname(user.displayName)
                            .balance(wallet.balance)
                            .rep(0) // TODO)) Rep value
                            .items(dbUser.inventoryItems.length)
                            .textActivity(textActivity)
                            .accountCreationDate(user.createdAt)
                            .exp(1234, 23001) // TODO)) Exp value
                            .level(42); // TODO)) Level value
                        voiceActivityHours = (0, date_fns_1.secondsToHours)(voiceActivitySeconds);
                        image.voiceActivity(voiceActivityHours);
                        // TODO)) Customizable background image
                        if ((_m = dbUser.profileSettings) === null || _m === void 0 ? void 0 : _m.title) {
                            image.title(dbUser.profileSettings.title.name);
                        }
                        else {
                            image.title("Użytkownik");
                        }
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return itx.guild.members.fetch(user.id); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return null; })];
                    case 8:
                        member = _t.sent();
                        if (member === null || member === void 0 ? void 0 : member.joinedAt) {
                            image.guildJoinDate(member.joinedAt);
                        }
                        if (((_o = dbUser.profileSettings) === null || _o === void 0 ? void 0 : _o.tintColorType) === "dynamic" &&
                            (member === null || member === void 0 ? void 0 : member.displayColor)) {
                            image.tintColor(member.displayColor);
                        }
                        else if (((_p = dbUser.profileSettings) === null || _p === void 0 ? void 0 : _p.tintColorType) === "custom" &&
                            dbUser.profileSettings.customTintColor) {
                            image.tintColor(dbUser.profileSettings.customTintColor);
                        }
                        else if (((_q = dbUser.profileSettings) === null || _q === void 0 ? void 0 : _q.tintColorType) === "fromItem" &&
                            dbUser.profileSettings.tintColor) {
                            image.tintColor(dbUser.profileSettings.tintColor.color);
                        }
                        avatarImageURL = (_r = user.avatarURL({ extension: "png", size: 256, forceStatic: true })) !== null && _r !== void 0 ? _r : user.defaultAvatarURL;
                        _h = (_g = image).avatarImage;
                        return [4 /*yield*/, fetchAsBuffer(avatarImageURL)];
                    case 9:
                        _h.apply(_g, [_t.sent()]);
                        if (!(dbUser.marriedTo && dbUser.marriedAt)) return [3 /*break*/, 12];
                        return [4 /*yield*/, itx.client.users.fetch(dbUser.marriedTo)];
                    case 10:
                        spouse = _t.sent();
                        embed.addFields({
                            name: "Małżeństwo :heart:",
                            value: "Z ".concat((0, discord_js_1.userMention)(spouse.id), " od ").concat((0, discord_js_1.time)(dbUser.marriedAt, discord_js_1.TimestampStyles.LongDate)),
                        });
                        marriedDays = (0, date_fns_1.differenceInDays)(itx.createdAt, dbUser.marriedAt);
                        spouseAvatarImageURL = (_s = spouse.avatarURL({ extension: "png", size: 256, forceStatic: true })) !== null && _s !== void 0 ? _s : spouse.defaultAvatarURL;
                        _k = (_j = image
                            .marriageStatusOpacity(1)
                            .marriageStatusDays(marriedDays)
                            .marriageStatusUsername(spouse.tag)
                            .marriageAvatarOpacity(1))
                            .marriageAvatarImage;
                        return [4 /*yield*/, fetchAsBuffer(spouseAvatarImageURL)];
                    case 11:
                        _k.apply(_j, [_t.sent()]);
                        return [3 /*break*/, 13];
                    case 12:
                        image.marriageStatusOpacity(0).marriageAvatarOpacity(0);
                        _t.label = 13;
                    case 13:
                        image.allShowcaseBadgesOpacity(0);
                        return [4 /*yield*/, prisma.displayedProfileBadge.findMany({
                                where: { userId: user.id },
                                include: { badge: true },
                            })];
                    case 14:
                        displayedBadges = _t.sent();
                        for (_i = 0, displayedBadges_1 = displayedBadges; _i < displayedBadges_1.length; _i++) {
                            _l = displayedBadges_1[_i], row = _l.row, col = _l.col, badge = _l.badge;
                            image.showcaseBadge(row, col, Buffer.from(badge.image));
                        }
                        _t.label = 15;
                    case 15:
                        _t.trys.push([15, 18, , 20]);
                        return [4 /*yield*/, image.toSharp().png().toBuffer()];
                    case 16:
                        attachment = _t.sent();
                        return [4 /*yield*/, itx.editReply({
                                content: (0, discord_js_1.subtext)("Profile graficzne są eksperymentalne, nie wszystkie statystyki są zgodne z prawdą."),
                                files: [{ name: "profil-".concat(user.tag, ".png"), attachment: attachment }],
                            })];
                    case 17:
                        _t.sent();
                        return [3 /*break*/, 20];
                    case 18:
                        e_1 = _t.sent();
                        if (!(e_1 instanceof discord_js_1.DiscordAPIError)) {
                            console.error("Failed to generate user profile image for user ".concat(user.tag), e_1);
                        }
                        else {
                            console.error("Failed to generate user profile image for user ".concat(user.tag, ": ").concat(e_1.code, " - ").concat(e_1.message));
                        }
                        return [4 /*yield*/, itx.editReply({
                                content: (0, discord_js_1.subtext)("Coś poszło nie tak przy generowaniu graficznego profilu! Spróbuj jeszcze raz lub zgłoś problem developerom."),
                                embeds: [embed],
                            })];
                    case 19:
                        _t.sent();
                        return [3 /*break*/, 20];
                    case 20: return [2 /*return*/];
                }
            });
        }); });
    })
        .addGroup("tytuł", function (group) {
        return group
            .setDescription("Tytuły profilu")
            .addCommand("lista", function (command) {
            return command
                .setDescription("Wyświetl swoje tytuły")
                .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var where, paginator, paginatedView;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            where = {
                                item: { guildId: itx.guildId, type: "profileTitle" },
                                userId: itx.user.id,
                                deletedAt: null,
                            };
                            paginator = new db_1.DatabasePaginator(function (props) {
                                return prisma.inventoryItem.findMany(__assign({ where: where, include: { item: true } }, props));
                            }, function () { return prisma.inventoryItem.count({ where: where }); });
                            paginatedView = new core_1.PaginatedView(paginator, "Posiadane tytuły", function (_a) {
                                var _b = _a.item, name = _b.name, id = _b.id, createdAt = _a.createdAt;
                                return "- ".concat(name, " (").concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.ShortDate), ") [").concat((0, discord_js_1.inlineCode)(id.toString()), "]");
                            }, false);
                            return [4 /*yield*/, paginatedView.render(itx)];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("ustaw", function (command) {
            return command
                .setDescription("Ustaw wyświetlany tytuł profilu")
                .addInteger("tytuł", function (command) {
                return command.setDescription("Tytuł").setAutocomplete(true);
            })
                .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var results;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, prisma.inventoryItem.findMany({
                                    where: {
                                        userId: itx.user.id,
                                        deletedAt: null,
                                        item: {
                                            guildId: itx.guildId,
                                            type: "profileTitle",
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
                                    var _b = _a.item, id = _b.id, name = _b.name;
                                    return ({ value: id, name: name });
                                }))];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var ownedTitle, _e, titleId, name;
                var prisma = _c.prisma;
                var id = _d.tytuł;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _f.sent();
                            return [4 /*yield*/, prisma.inventoryItem.findFirst({
                                    where: {
                                        item: {
                                            id: id,
                                            guildId: itx.guildId,
                                            type: "profileTitle",
                                        },
                                        userId: itx.user.id,
                                        deletedAt: null,
                                    },
                                    include: { item: true },
                                })];
                        case 2:
                            ownedTitle = _f.sent();
                            if (!!ownedTitle) return [3 /*break*/, 4];
                            return [4 /*yield*/, itx.editReply("Tytuł o tym ID nie istnieje lub go nie posiadasz!")];
                        case 3:
                            _f.sent();
                            return [2 /*return*/];
                        case 4:
                            _e = ownedTitle.item, titleId = _e.id, name = _e.name;
                            return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                        case 5:
                            _f.sent();
                            return [4 /*yield*/, prisma.profileSettings.upsert({
                                    create: { titleId: titleId, userId: itx.user.id },
                                    update: { titleId: titleId },
                                    where: { userId: itx.user.id },
                                })];
                        case 6:
                            _f.sent();
                            return [4 /*yield*/, itx.editReply("Ustawiono tytu\u0142 ".concat((0, discord_js_1.italic)(name)))];
                        case 7:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    })
        .addGroup("odznaki", function (group) {
        return group
            .setDescription("Odznaki profilu")
            .addCommand("lista", function (command) {
            return command
                .setDescription("Wyświetl swoje odznaki")
                .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var where, paginator, paginatedView;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            where = {
                                item: { guildId: itx.guildId, type: "badge" },
                                userId: itx.user.id,
                                deletedAt: null,
                            };
                            paginator = new db_1.DatabasePaginator(function (props) {
                                return prisma.inventoryItem.findMany(__assign({ where: where, include: { item: true } }, props));
                            }, function () { return prisma.inventoryItem.count({ where: where }); });
                            paginatedView = new core_1.PaginatedView(paginator, "Posiadane odznaki", function (_a) {
                                var _b = _a.item, name = _b.name, id = _b.id, createdAt = _a.createdAt;
                                return "- ".concat(name, " (").concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.ShortDate), ") [").concat((0, discord_js_1.inlineCode)(id.toString()), "]");
                            }, false);
                            return [4 /*yield*/, paginatedView.render(itx)];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("ustaw", function (command) {
            return command
                .setDescription("Wyświetl odznakę na profilu")
                .addInteger("wiersz", function (row) {
                return row.setDescription("Numer wiersza (1-3)").setMinValue(1).setMaxValue(3);
            })
                .addInteger("kolumna", function (column) {
                return column
                    .setDescription("Numer kolumny (1-5)")
                    .setMinValue(1)
                    .setMaxValue(5);
            })
                // FIXME: This being auto-completed while row and column are not
                //        can lead to an interaction error when trying to receive
                //        autocomplete results, because row and column are not set.
                .addInteger("odznaka", function (id) {
                return id.setDescription("Odznaka").setAutocomplete(true);
            })
                .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var results;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, prisma.inventoryItem.findMany({
                                    where: {
                                        userId: itx.user.id,
                                        deletedAt: null,
                                        item: {
                                            guildId: itx.guildId,
                                            type: "badge",
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
                                    var _b = _a.item, id = _b.id, name = _b.name;
                                    return ({ value: id, name: name });
                                }))];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var ownedBadge, _e, name, badgeId;
                var prisma = _c.prisma;
                var id = _d.odznaka, row = _d.wiersz, col = _d.kolumna;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _f.sent();
                            return [4 /*yield*/, prisma.inventoryItem.findFirst({
                                    where: {
                                        item: {
                                            id: id,
                                            guildId: itx.guildId,
                                            type: "badge",
                                        },
                                        userId: itx.user.id,
                                        deletedAt: null,
                                    },
                                    include: {
                                        item: {
                                            include: { badge: true },
                                        },
                                    },
                                })];
                        case 2:
                            ownedBadge = _f.sent();
                            if (!!(ownedBadge === null || ownedBadge === void 0 ? void 0 : ownedBadge.item.badge)) return [3 /*break*/, 4];
                            return [4 /*yield*/, itx.editReply("Odznaka o tym ID nie istnieje lub jej nie posiadasz!")];
                        case 3:
                            _f.sent();
                            return [2 /*return*/];
                        case 4:
                            _e = ownedBadge.item, name = _e.name, badgeId = _e.badge.id;
                            return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                        case 5:
                            _f.sent();
                            return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: 
                                            // Remove placement on the same row and column we're trying to place a new badge
                                            return [4 /*yield*/, tx.displayedProfileBadge.deleteMany({
                                                    where: { userId: itx.user.id, row: row, col: col },
                                                })];
                                            case 1:
                                                // Remove placement on the same row and column we're trying to place a new badge
                                                _a.sent();
                                                // Update badge on an existing placement
                                                return [4 /*yield*/, tx.displayedProfileBadge.upsert({
                                                        create: { userId: itx.user.id, badgeId: badgeId, row: row, col: col },
                                                        update: { badgeId: badgeId, row: row, col: col },
                                                        where: {
                                                            userId_badgeId: { userId: itx.user.id, badgeId: badgeId },
                                                        },
                                                    })];
                                            case 2:
                                                // Update badge on an existing placement
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 6:
                            _f.sent();
                            return [4 /*yield*/, itx.editReply("Ustawiono odznak\u0119 ".concat((0, discord_js_1.italic)(name), " na pozycji ").concat(row, ":").concat(col))];
                        case 7:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("usuń", function (command) {
            return command
                .setDescription("Usuń odznakę z profilu")
                .addInteger("wiersz", function (row) {
                return row.setDescription("Numer wiersza (1-3)").setMinValue(1).setMaxValue(3);
            })
                .addInteger("kolumna", function (column) {
                return column
                    .setDescription("Numer kolumny (1-5)")
                    .setMinValue(1)
                    .setMaxValue(5);
            })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var count;
                var prisma = _c.prisma;
                var row = _d.wiersz, col = _d.kolumna;
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
                            return [4 /*yield*/, prisma.displayedProfileBadge.deleteMany({
                                    where: { userId: itx.user.id, row: row, col: col },
                                })];
                        case 3:
                            count = (_e.sent()).count;
                            if (!(count === 0)) return [3 /*break*/, 5];
                            return [4 /*yield*/, itx.editReply("Nie masz odznaki na tej pozycji!")];
                        case 4:
                            _e.sent();
                            return [2 /*return*/];
                        case 5: return [4 /*yield*/, itx.editReply("Usuni\u0119to odznak\u0119 z pozycji ".concat(row, ":").concat(col))];
                        case 6:
                            _e.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    })
        .addGroup("kolor", function (group) {
        return group
            .setDescription("Kolor profilu")
            .addCommand("lista", function (command) {
            return command
                .setDescription("Wyświetl swoje kolory profilu")
                .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var where, paginator, accesses, accessBadges, accessesText, paginatedView;
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
                                item: { guildId: itx.guildId, type: "staticTintColor" },
                                userId: itx.user.id,
                                deletedAt: null,
                            };
                            paginator = new db_1.DatabasePaginator(function (props) {
                                return prisma.inventoryItem.findMany(__assign({ where: where, include: { item: true } }, props));
                            }, function () { return prisma.inventoryItem.count({ where: where }); });
                            return [4 /*yield*/, getUserAccesses(prisma, itx.guildId, itx.user.id)];
                        case 2:
                            accesses = _c.sent();
                            accessBadges = [
                                {
                                    name: "Dynamiczny kolor z nicku",
                                    access: accesses.includes("dynamicTintColorAccess"),
                                },
                                {
                                    name: "Dowolny kolor profilu",
                                    access: accesses.includes("customTintColorAccess"),
                                },
                            ];
                            accessesText = accessBadges
                                .map(function (_a) {
                                var name = _a.name, access = _a.access;
                                return "".concat(access ? "✅" : "❌", " ").concat(name);
                            })
                                .join("\n");
                            paginatedView = new core_1.PaginatedView(paginator, "Posiadane kolory profilu", function (_a) {
                                var _b = _a.item, name = _b.name, id = _b.id, createdAt = _a.createdAt;
                                return "- ".concat(name, " (").concat((0, discord_js_1.time)(createdAt, discord_js_1.TimestampStyles.ShortDate), ") [").concat((0, discord_js_1.inlineCode)(id.toString()), "]");
                            }, false, accessesText);
                            return [4 /*yield*/, paginatedView.render(itx)];
                        case 3:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("domyślny", function (command) {
            return command
                .setDescription("Ustaw domyślny kolor profilu")
                .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _c.sent();
                            // TODO)) Wrap this into a less verbose utility
                            return [4 /*yield*/, prisma.profileSettings.upsert({
                                    create: {
                                        tintColorType: "default",
                                        customTintColor: null,
                                        tintColorId: null,
                                        userId: itx.user.id,
                                    },
                                    update: {
                                        tintColorType: "default",
                                        customTintColor: null,
                                        tintColorId: null,
                                    },
                                    where: { userId: itx.user.id },
                                })];
                        case 2:
                            // TODO)) Wrap this into a less verbose utility
                            _c.sent();
                            return [4 /*yield*/, itx.editReply("Ustawiono domyślny kolor profilu")];
                        case 3:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("item", function (command) {
            return command
                .setDescription("Ustaw kolor profilu z przedmiotu")
                .addInteger("przedmiot", function (id) {
                return id.setDescription("Przedmiot").setAutocomplete(true);
            })
                .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var results;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, prisma.inventoryItem.findMany({
                                    where: {
                                        userId: itx.user.id,
                                        deletedAt: null,
                                        item: {
                                            guildId: itx.guildId,
                                            type: "staticTintColor",
                                            name: {
                                                contains: itx.options.getFocused(),
                                                mode: "insensitive",
                                            },
                                            tintColor: { isNot: null },
                                        },
                                    },
                                    include: { item: true },
                                })];
                        case 1:
                            results = _c.sent();
                            return [4 /*yield*/, itx.respond(results.map(function (_a) {
                                    var _b = _a.item, id = _b.id, name = _b.name;
                                    return ({ value: id, name: name });
                                }))];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var ownedColor, _e, name, tintColorId;
                var prisma = _c.prisma;
                var id = _d.przedmiot;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _f.sent();
                            return [4 /*yield*/, prisma.inventoryItem.findFirst({
                                    where: {
                                        item: {
                                            id: id,
                                            guildId: itx.guildId,
                                            type: "staticTintColor",
                                        },
                                        userId: itx.user.id,
                                        deletedAt: null,
                                    },
                                    include: {
                                        item: {
                                            include: { tintColor: true },
                                        },
                                    },
                                })];
                        case 2:
                            ownedColor = _f.sent();
                            if (!!(ownedColor === null || ownedColor === void 0 ? void 0 : ownedColor.item.tintColor)) return [3 /*break*/, 4];
                            return [4 /*yield*/, itx.editReply("Kolor o tym ID nie istnieje lub go nie posiadasz!")];
                        case 3:
                            _f.sent();
                            return [2 /*return*/];
                        case 4:
                            _e = ownedColor.item, name = _e.name, tintColorId = _e.tintColor.id;
                            // TODO)) Wrap this into a less verbose utility
                            return [4 /*yield*/, prisma.profileSettings.upsert({
                                    create: {
                                        tintColorType: "fromItem",
                                        customTintColor: null,
                                        tintColorId: tintColorId,
                                        userId: itx.user.id,
                                    },
                                    update: {
                                        tintColorType: "fromItem",
                                        customTintColor: null,
                                        tintColorId: tintColorId,
                                    },
                                    where: { userId: itx.user.id },
                                })];
                        case 5:
                            // TODO)) Wrap this into a less verbose utility
                            _f.sent();
                            return [4 /*yield*/, itx.editReply("Ustawiono kolor profilu ".concat((0, discord_js_1.italic)(name)))];
                        case 6:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("z-nicku", function (command) {
            return command
                .setDescription("Ustaw dynamiczny kolor profilu z koloru nicku")
                .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
                var accesses, hasAccess;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _c.sent();
                            return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                        case 2:
                            _c.sent();
                            return [4 /*yield*/, getUserAccesses(prisma, itx.guildId, itx.user.id)];
                        case 3:
                            accesses = _c.sent();
                            hasAccess = accesses.includes("dynamicTintColorAccess");
                            if (!!hasAccess) return [3 /*break*/, 5];
                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie posiadasz dostępu do ustawiania dowolnych kolorów profilu!")];
                        case 4: return [2 /*return*/, _c.sent()];
                        case 5: 
                        // TODO)) Wrap this into a less verbose utility
                        return [4 /*yield*/, prisma.profileSettings.upsert({
                                create: {
                                    tintColorType: "dynamic",
                                    customTintColor: null,
                                    tintColorId: null,
                                    userId: itx.user.id,
                                },
                                update: {
                                    tintColorType: "dynamic",
                                    customTintColor: null,
                                    tintColorId: null,
                                },
                                where: { userId: itx.user.id },
                            })];
                        case 6:
                            // TODO)) Wrap this into a less verbose utility
                            _c.sent();
                            return [4 /*yield*/, itx.editReply("Ustawiono dynamiczny kolor profilu z koloru nicku")];
                        case 7:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("hex", function (command) {
            return command
                .setDescription("Ustaw dowolny kolor profilu")
                .addString("hex", function (hex) { return hex.setDescription("Hex koloru (np. #ff5632)"); })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var color, accesses, hasAccess;
                var prisma = _c.prisma;
                var hex = _d.hex;
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
                            return [4 /*yield*/, getUserAccesses(prisma, itx.guildId, itx.user.id)];
                        case 5:
                            accesses = _e.sent();
                            hasAccess = accesses.includes("customTintColorAccess");
                            if (!!hasAccess) return [3 /*break*/, 7];
                            return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie posiadasz dostępu do ustawiania dowolnych kolorów profilu!")];
                        case 6: return [2 /*return*/, _e.sent()];
                        case 7: 
                        // TODO)) Wrap this into a less verbose utility
                        return [4 /*yield*/, prisma.profileSettings.upsert({
                                create: {
                                    tintColorType: "custom",
                                    customTintColor: color,
                                    tintColorId: null,
                                    userId: itx.user.id,
                                },
                                update: {
                                    tintColorType: "custom",
                                    customTintColor: color,
                                    tintColorId: null,
                                },
                                where: { userId: itx.user.id },
                            })];
                        case 8:
                            // TODO)) Wrap this into a less verbose utility
                            _e.sent();
                            return [4 /*yield*/, itx.editReply("Ustawiono kolor profilu ".concat((0, discord_js_1.bold)(hex)))];
                        case 9:
                            _e.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
});
