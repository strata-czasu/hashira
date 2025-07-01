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
var discordTry_1 = require("../util/discordTry");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
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
            var user, dbUser, wallet, formattedBalance, textActivity, voiceActivitySeconds, embed, file, svg, _e, _f, image, voiceActivityHours, member, avatarImageURL, _g, _h, spouse, marriedDays, spouseAvatarImageURL, _j, _k, displayedBadges, _i, displayedBadges_1, _l, row, col, badge, attachment, e_1;
            var _m, _o, _p;
            var prisma = _c.prisma;
            var rawUser = _d.user;
            return __generator(this, function (_q) {
                switch (_q.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        user = rawUser !== null && rawUser !== void 0 ? rawUser : itx.user;
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, user.id)];
                    case 1:
                        _q.sent();
                        return [4 /*yield*/, prisma.user.findFirst({
                                where: {
                                    id: user.id,
                                },
                                include: {
                                    inventoryItems: true,
                                    profileSettings: {
                                        include: {
                                            title: true,
                                        },
                                    },
                                },
                            })];
                    case 2:
                        dbUser = _q.sent();
                        if (!dbUser)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 3:
                        _q.sent();
                        return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                                prisma: prisma,
                                userId: user.id,
                                guildId: itx.guildId,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            })];
                    case 4:
                        wallet = _q.sent();
                        formattedBalance = (0, util_1.formatBalance)(wallet.balance, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                        return [4 /*yield*/, prisma.userTextActivity.count({
                                where: {
                                    userId: user.id,
                                    guildId: itx.guildId,
                                    timestamp: {
                                        gte: (0, date_fns_1.sub)(itx.createdAt, { days: 30 }),
                                    },
                                },
                            })];
                    case 5:
                        textActivity = _q.sent();
                        return [4 /*yield*/, prisma.voiceSessionTotal.aggregate({
                                _sum: {
                                    secondsSpent: true,
                                },
                                where: {
                                    isMuted: false,
                                    isDeafened: false,
                                    isAlone: false,
                                    voiceSession: {
                                        guildId: itx.guildId,
                                        userId: user.id,
                                        joinedAt: {
                                            gte: (0, date_fns_1.sub)(itx.createdAt, { days: 30 }),
                                        },
                                    },
                                },
                            })];
                    case 6:
                        voiceActivitySeconds = (_q.sent())._sum.secondsSpent;
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
                        svg = _f.apply(_e, [_q.sent()]);
                        image = new imageBuilder_1.ProfileImageBuilder(svg);
                        image
                            .tintColor("#aa85a4")
                            .nickname(user.displayName)
                            .balance(wallet.balance)
                            .rep(0) // TODO)) Rep value
                            .items(dbUser.inventoryItems.length)
                            .textActivity(textActivity)
                            .accountCreationDate(user.createdAt)
                            .exp(1234, 23001) // TODO)) Exp value
                            .level(42); // TODO)) Level value
                        if (voiceActivitySeconds) {
                            voiceActivityHours = (0, date_fns_1.secondsToHours)(voiceActivitySeconds);
                            image.voiceActivity(voiceActivityHours);
                        }
                        // TODO)) Customizable background image
                        if ((_m = dbUser.profileSettings) === null || _m === void 0 ? void 0 : _m.title) {
                            image.title(dbUser.profileSettings.title.name);
                        }
                        else {
                            image.title("Użytkownik");
                        }
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return itx.guild.members.fetch(user.id); }, [discord_js_1.RESTJSONErrorCodes.UnknownMember], function () { return null; })];
                    case 8:
                        member = _q.sent();
                        if (member === null || member === void 0 ? void 0 : member.joinedAt) {
                            image.guildJoinDate(member.joinedAt);
                        }
                        avatarImageURL = (_o = user.avatarURL({ extension: "png", size: 256, forceStatic: true })) !== null && _o !== void 0 ? _o : user.defaultAvatarURL;
                        _h = (_g = image).avatarImage;
                        return [4 /*yield*/, fetchAsBuffer(avatarImageURL)];
                    case 9:
                        _h.apply(_g, [_q.sent()]);
                        if (!(dbUser.marriedTo && dbUser.marriedAt)) return [3 /*break*/, 12];
                        return [4 /*yield*/, itx.client.users.fetch(dbUser.marriedTo)];
                    case 10:
                        spouse = _q.sent();
                        embed.addFields({
                            name: "Małżeństwo :heart:",
                            value: "Z ".concat((0, discord_js_1.userMention)(spouse.id), " od ").concat((0, discord_js_1.time)(dbUser.marriedAt, discord_js_1.TimestampStyles.LongDate)),
                        });
                        marriedDays = (0, date_fns_1.differenceInDays)(itx.createdAt, dbUser.marriedAt);
                        spouseAvatarImageURL = (_p = spouse.avatarURL({ extension: "png", size: 256, forceStatic: true })) !== null && _p !== void 0 ? _p : spouse.defaultAvatarURL;
                        _k = (_j = image
                            .marriageStatusOpacity(1)
                            .marriageStatusDays(marriedDays)
                            .marriageStatusUsername(spouse.tag)
                            .marriageAvatarOpacity(1))
                            .marriageAvatarImage;
                        return [4 /*yield*/, fetchAsBuffer(spouseAvatarImageURL)];
                    case 11:
                        _k.apply(_j, [_q.sent()]);
                        return [3 /*break*/, 13];
                    case 12:
                        image.marriageStatusOpacity(0).marriageAvatarOpacity(0);
                        _q.label = 13;
                    case 13:
                        image.allShowcaseBadgesOpacity(0);
                        return [4 /*yield*/, prisma.displayedProfileBadge.findMany({
                                where: { userId: user.id },
                                include: { badge: true },
                            })];
                    case 14:
                        displayedBadges = _q.sent();
                        for (_i = 0, displayedBadges_1 = displayedBadges; _i < displayedBadges_1.length; _i++) {
                            _l = displayedBadges_1[_i], row = _l.row, col = _l.col, badge = _l.badge;
                            image.showcaseBadge(row, col, Buffer.from(badge.image));
                        }
                        _q.label = 15;
                    case 15:
                        _q.trys.push([15, 18, , 20]);
                        return [4 /*yield*/, image.toSharp().png().toBuffer()];
                    case 16:
                        attachment = _q.sent();
                        return [4 /*yield*/, itx.editReply({
                                files: [{ name: "profil-".concat(user.tag, ".png"), attachment: attachment }],
                            })];
                    case 17:
                        _q.sent();
                        return [3 /*break*/, 20];
                    case 18:
                        e_1 = _q.sent();
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
                        _q.sent();
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
                                item: { type: "profileTitle" },
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
                .addInteger("id", function (command) { return command.setDescription("ID tytułu"); })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var ownedTitle, _e, titleId, name;
                var prisma = _c.prisma;
                var id = _d.id;
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
                                        item: { id: id, type: "profileTitle" },
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
                                item: { type: "badge" },
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
                .addInteger("id", function (id) { return id.setDescription("ID odznaki"); })
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
                var ownedBadge, _e, name, badgeId;
                var prisma = _c.prisma;
                var id = _d.id, row = _d.wiersz, col = _d.kolumna;
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
                                        item: { id: id, type: "badge" },
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
    });
});
