"use strict";
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
exports.giveaway = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var duration_1 = require("../util/duration");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
var singleUseButton_1 = require("../util/singleUseButton");
var util_1 = require("./util");
exports.giveaway = new core_1.Hashira({ name: "giveaway" })
    .use(base_1.base)
    .group("givek", function (group) {
    return group
        .setDescription("Komendy do givków.")
        .setDMPermission(false)
        .addCommand("create", function (command) {
        return command
            .setDescription("Tworzenie giveawayów z różnymi nagrodami")
            .addString("nagrody", function (rewards) {
            return rewards.setDescription("Nagrody do rozdania, oddzielone przecinkami, gdy nagród jest więcej to piszemy np. 2x200 punktów");
        })
            .addString("czas-trwania", function (duration) {
            return duration.setDescription("Czas trwania givka, np. 1d (1 dzień) lub 2h (2 godziny)");
        })
            .addString("tytul", function (tytul) {
            return tytul
                .setDescription("Tytuł giveawaya, domyślnie 'Giveaway'")
                .setRequired(false);
        })
            .addAttachment("baner", function (baner) {
            return baner
                .setDescription("Baner wyświetlany na górze giveawaya. Domyślny można wyłączyć ustawiając format na brak.")
                .setRequired(false);
        })
            .addNumber("format-baneru", function (format) {
            return format
                .setDescription("Konwertuje baner do wybranego współczynnika proporcji, domyślnie 'Bez zmian'.")
                .setRequired(false)
                .addChoices({ name: "Brak baneru", value: util_1.GiveawayBannerRatio.None }, { name: "Bez zmian", value: util_1.GiveawayBannerRatio.Auto }, { name: "Szeroki (3:1)", value: util_1.GiveawayBannerRatio.Landscape }, { name: "Wysoki (2:3)", value: util_1.GiveawayBannerRatio.Portrait });
        })
            .addRole("wymagana-rola", function (whitelist) {
            return whitelist
                .setDescription("Wymagana rola do wzięcia udziału.")
                .setRequired(false);
        })
            .addRole("zakazana-rola", function (blacklist) {
            return blacklist
                .setDescription("Zakazana rola do wzięcia udziału.")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var ratio, files, imageURL, _e, buffer, ext, attachment, parsedRewards, parsedTime, durationSeconds, endTime, totalRewards, confirmButton, messageContainer, roleRestriction, responseConfirm, confirmIndex, confirmation, response, giveaway;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var rewards = _d.nagrody, duration = _d["czas-trwania"], title = _d.tytul, banner = _d.baner, format = _d["format-baneru"], whitelist = _d["wymagana-rola"], blacklist = _d["zakazana-rola"];
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                    case 1:
                        _f.sent();
                        return [4 /*yield*/, itx.deferReply({
                                flags: discord_js_1.MessageFlags.Ephemeral,
                            })];
                    case 2:
                        _f.sent();
                        ratio = format !== null
                            ? format
                            : util_1.GiveawayBannerRatio.Auto;
                        files = [];
                        if (!(banner && ratio !== util_1.GiveawayBannerRatio.None)) return [3 /*break*/, 8];
                        if (!(banner.size > 4000000)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Baner jest za du\u017Cy (>4MB). Aktualny rozmiar pliku: ".concat((0, es_toolkit_1.round)(banner.size / 1000000, 1), " MB."))];
                    case 3: return [2 /*return*/, _f.sent()];
                    case 4: return [4 /*yield*/, (0, util_1.formatBanner)(banner, ratio)];
                    case 5:
                        _e = _f.sent(), buffer = _e[0], ext = _e[1];
                        if (!!buffer) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podano nieprawid\u0142owy format baneru. (".concat(banner.contentType, ")"))];
                    case 6: return [2 /*return*/, _f.sent()];
                    case 7:
                        attachment = new discord_js_1.AttachmentBuilder(buffer).setName("banner.".concat(ext));
                        files.push(attachment);
                        imageURL = "attachment://banner.".concat(ext);
                        return [3 /*break*/, 9];
                    case 8:
                        imageURL = (0, util_1.getStaticBanner)(title || "Giveaway");
                        _f.label = 9;
                    case 9:
                        parsedRewards = (0, util_1.parseRewards)(rewards);
                        parsedTime = (0, duration_1.parseDuration)(duration);
                        if (!(parsedTime === null)) return [3 /*break*/, 11];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podano nieprawidłowy czas")];
                    case 10: return [2 /*return*/, _f.sent()];
                    case 11:
                        durationSeconds = (0, duration_1.durationToSeconds)(parsedTime);
                        endTime = (0, date_fns_1.addSeconds)(itx.createdAt, durationSeconds);
                        totalRewards = parsedRewards.reduce(function (sum, r) { return sum + r.amount; }, 0);
                        confirmButton = new discord_js_1.ButtonBuilder()
                            .setCustomId("confirm")
                            .setLabel("Potwierdź poprawność")
                            .setStyle(discord_js_1.ButtonStyle.Secondary);
                        messageContainer = new discord_js_1.ContainerBuilder();
                        if (ratio !== util_1.GiveawayBannerRatio.None) {
                            messageContainer.addMediaGalleryComponents(function (mg) {
                                return mg.addItems(function (mgi) {
                                    return mgi
                                        .setDescription("Banner for giveaway: ".concat(title || "Giveaway"))
                                        .setURL(imageURL);
                                });
                            });
                        }
                        roleRestriction = [];
                        if (whitelist || blacklist)
                            roleRestriction.push("### Restrykcje:");
                        if (whitelist)
                            roleRestriction.push("-# Wymagane role: ".concat(whitelist));
                        if (blacklist)
                            roleRestriction.push("-# Zakazane role: ".concat(blacklist));
                        messageContainer
                            .setAccentColor(0x0099ff)
                            .addTextDisplayComponents(function (td) {
                            return td.setContent("# ".concat(title || "Giveaway"));
                        })
                            .addTextDisplayComponents(function (td) {
                            return td.setContent("-# Host: ".concat(itx.user, "\n").concat(roleRestriction.join("\n")));
                        })
                            .addSeparatorComponents(function (s) { return s.setSpacing(discord_js_1.SeparatorSpacingSize.Large); })
                            .addTextDisplayComponents(function (td) {
                            return td.setContent("".concat(parsedRewards.map(function (r) { return "".concat(r.amount, "x ").concat(r.reward); }).join("\n"), "\n"));
                        })
                            .addTextDisplayComponents(function (td) {
                            return td.setContent("Koniec ".concat((0, discord_js_1.time)(endTime, "R"))).setId(4);
                        })
                            .addSeparatorComponents(function (s) { return s; })
                            .addTextDisplayComponents(function (td) {
                            return td
                                .setContent("-# Uczestnicy: 0 | \u0141\u0105cznie nagr\u00F3d: ".concat(totalRewards, " | Id: ?"))
                                .setId(1);
                        })
                            .addTextDisplayComponents(function (td) {
                            return td
                                .setContent("Potwierdź jeśli wszystko się zgadza w giveawayu.")
                                .setId(99);
                        })
                            .addActionRowComponents(function (ar) { return ar.setComponents([confirmButton]); });
                        return [4 /*yield*/, itx.editReply({
                                components: [messageContainer],
                                files: files,
                                flags: [discord_js_1.MessageFlags.IsComponentsV2],
                            })];
                    case 12:
                        responseConfirm = _f.sent();
                        confirmIndex = messageContainer.components.findIndex(function (c) { var _a, _b; return ((_a = c.data) === null || _a === void 0 ? void 0 : _a.id) === 99 && ((_b = c.data) === null || _b === void 0 ? void 0 : _b.type) === discord_js_1.ComponentType.TextDisplay; });
                        messageContainer.spliceComponents(confirmIndex, 2);
                        if (!responseConfirm) {
                            throw new Error("Failed to receive response from interaction reply");
                        }
                        return [4 /*yield*/, (0, singleUseButton_1.waitForButtonClick)(responseConfirm, "confirm", { minutes: 1 }, function (interaction) { return interaction.user.id === itx.user.id; })];
                    case 13:
                        confirmation = _f.sent();
                        if (!confirmation.interaction)
                            return [2 /*return*/];
                        itx.deleteReply();
                        messageContainer.addActionRowComponents(util_1.giveawayButtonRow.setId(2));
                        return [4 /*yield*/, itx.followUp({
                                components: [messageContainer],
                                files: files,
                                withResponse: true,
                                flags: discord_js_1.MessageFlags.IsComponentsV2,
                            })];
                    case 14:
                        response = _f.sent();
                        if (!response) {
                            throw new Error("Failed to receive response from interaction reply");
                        }
                        return [4 /*yield*/, prisma.giveaway.create({
                                data: {
                                    authorId: itx.user.id,
                                    messageId: response.id,
                                    channelId: response.channelId,
                                    guildId: response.guildId,
                                    endAt: endTime,
                                    roleWhitelist: whitelist ? [whitelist.id] : [],
                                    roleBlacklist: blacklist ? [blacklist.id] : [],
                                    participants: { create: [] },
                                    rewards: {
                                        create: parsedRewards.map(function (_a) {
                                            var amount = _a.amount, reward = _a.reward;
                                            return ({
                                                amount: amount,
                                                reward: reward,
                                            });
                                        }),
                                    },
                                    totalRewards: totalRewards,
                                },
                            })];
                    case 15:
                        giveaway = _f.sent();
                        return [4 /*yield*/, messageQueue.push("giveawayEnd", { giveawayId: giveaway.id }, Math.floor((endTime.valueOf() - response.createdAt.valueOf()) / 1000), giveaway.id.toString())];
                    case 16:
                        _f.sent();
                        (0, util_1.updateGiveaway)(response, giveaway, prisma);
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("time-add", function (command) {
        return command
            .setDescription("Dodawanie czasu do istniejącego giveawaya.")
            .addInteger("id", function (id) {
            return id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true);
        })
            .addString("czas", function (czas) {
            return czas.setDescription("Czas do dodania (np. 1d, 2h, 5m).").setRequired(true);
        })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [2 /*return*/, (0, util_1.autocompleteGiveawayId)({ prisma: prisma, itx: itx })];
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var giveaway, channel, message, parsedTime, durationSeconds, newEndTime, container, timeIndex;
            var prisma = _c.prisma, messageQueue = _c.messageQueue;
            var id = _d.id, czas = _d.czas;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.giveaway.findFirst({
                            where: {
                                id: id,
                            },
                        })];
                    case 1:
                        giveaway = _e.sent();
                        if (!(!giveaway || giveaway.endAt < itx.createdAt)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ten giveaway nie istnieje lub się zakończył!")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3:
                        if (!(itx.user.id !== giveaway.authorId)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie masz uprawnień do edycji tego giveawaya!")];
                    case 4: return [2 /*return*/, _e.sent()];
                    case 5: return [4 /*yield*/, itx.client.channels.fetch(giveaway.channelId)];
                    case 6:
                        channel = _e.sent();
                        if (!channel || !channel.isSendable()) {
                            throw new Error("Channel ".concat(channel, " is not sendable or not found."));
                        }
                        return [4 /*yield*/, channel.messages.fetch(giveaway.messageId)];
                    case 7:
                        message = _e.sent();
                        if (!message || !message.components[0]) {
                            throw new Error("Message ".concat(message, " or it's component not found."));
                        }
                        parsedTime = (0, duration_1.parseDuration)(czas);
                        if (!(parsedTime === null)) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podano nieprawidłowy czas")];
                    case 8: return [2 /*return*/, _e.sent()];
                    case 9:
                        durationSeconds = (0, duration_1.durationToSeconds)(parsedTime);
                        newEndTime = (0, date_fns_1.addSeconds)(giveaway.endAt, durationSeconds);
                        container = new discord_js_1.ContainerBuilder(message.components[0].toJSON());
                        timeIndex = container.components.findIndex(function (c) { var _a, _b; return ((_a = c.data) === null || _a === void 0 ? void 0 : _a.id) === 4 && ((_b = c.data) === null || _b === void 0 ? void 0 : _b.type) === discord_js_1.ComponentType.TextDisplay; });
                        if (timeIndex === -1)
                            return [2 /*return*/];
                        container.components[timeIndex] = new discord_js_1.TextDisplayBuilder().setContent("Koniec ".concat((0, discord_js_1.time)(newEndTime, "R")));
                        return [4 /*yield*/, message.edit({ components: [container] })];
                    case 10:
                        _e.sent();
                        return [4 /*yield*/, messageQueue.updateDelay("giveawayEnd", giveaway.id.toString(), newEndTime)];
                    case 11:
                        _e.sent();
                        return [4 /*yield*/, prisma.giveaway.update({
                                where: {
                                    id: id,
                                },
                                data: {
                                    endAt: newEndTime,
                                },
                            })];
                    case 12:
                        _e.sent();
                        return [4 /*yield*/, itx.reply({
                                content: "Pomy\u015Blnie dodano do czasu ".concat((0, duration_1.formatDuration)(parsedTime), ", giveaway zako\u0144czy si\u0119 ").concat((0, discord_js_1.time)(newEndTime, "R"), ".").concat((0, util_1.giveawayFooter)(giveaway)),
                                flags: "Ephemeral",
                            })];
                    case 13:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("reroll", function (command) {
        return command
            .setDescription("Losuje jednego użytkownika spośród tych którzy nie wygrali giveawaya.")
            .addInteger("id", function (id) {
            return id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true);
        })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [2 /*return*/, (0, util_1.autocompleteGiveawayId)({ prisma: prisma, itx: itx })];
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var giveaway, _e, participants, winners, filtered, newWinner;
            var prisma = _c.prisma;
            var id = _d.id;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, prisma.giveaway.findFirst({
                            where: {
                                id: id,
                            },
                        })];
                    case 1:
                        giveaway = _f.sent();
                        if (!!giveaway) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ten giveaway nie istnieje!")];
                    case 2: return [2 /*return*/, _f.sent()];
                    case 3:
                        if (!(itx.user.id !== giveaway.authorId)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie masz uprawnień do rerollowania tego giveawaya!")];
                    case 4: return [2 /*return*/, _f.sent()];
                    case 5: return [4 /*yield*/, prisma.$transaction([
                            prisma.giveawayParticipant.findMany({
                                where: { giveawayId: giveaway.id, isRemoved: false },
                            }),
                            prisma.giveawayWinner.findMany({
                                where: { giveawayId: giveaway.id },
                            }),
                        ])];
                    case 6:
                        _e = _f.sent(), participants = _e[0], winners = _e[1];
                        filtered = participants.filter(function (p) { return !winners.some(function (w) { return w.userId === p.userId; }); });
                        newWinner = filtered.length > 0 ? (0, es_toolkit_1.shuffle)(filtered)[0] : null;
                        if (!!newWinner) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Brak dost\u0119pnych uczestnik\u00F3w do rerollowania!".concat((0, util_1.giveawayFooter)(giveaway)))];
                    case 7: return [2 /*return*/, _f.sent()];
                    case 8: return [4 /*yield*/, itx.reply({
                            content: "Nowy wygrany: <@".concat(newWinner.userId, ">").concat((0, util_1.giveawayFooter)(giveaway)),
                            allowedMentions: { users: [newWinner.userId] },
                        })];
                    case 9:
                        _f.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("list-users", function (command) {
        return command
            .setDescription("Pokazuje liste użytkowników w giveawayu, w razie gdy się zakończy.")
            .addInteger("id", function (id) {
            return id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true);
        })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [2 /*return*/, (0, util_1.autocompleteGiveawayId)({ prisma: prisma, itx: itx })];
            });
        }); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var giveaway, participants, fmtParticipants;
            var prisma = _c.prisma;
            var id = _d.id;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.giveaway.findFirst({
                            where: {
                                id: id,
                            },
                        })];
                    case 1:
                        giveaway = _e.sent();
                        if (!!giveaway) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ten giveaway nie istnieje!")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3: return [4 /*yield*/, prisma.giveawayParticipant.findMany({
                            where: { giveawayId: giveaway.id, isRemoved: false },
                        })];
                    case 4:
                        participants = _e.sent();
                        fmtParticipants = participants.length > 0
                            ? participants.map(function (user) { return "<@".concat(user.userId, ">"); }).join(", ")
                            : "Brak uczestników";
                        return [4 /*yield*/, itx.reply({
                                content: "Uczestnicy: ".concat(fmtParticipants).concat((0, util_1.giveawayFooter)(giveaway)),
                                flags: "Ephemeral",
                            })];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("remove-user", function (command) {
        return command
            .setDescription("Usuwa użytkownika z giveawaya.")
            .addInteger("id", function (id) {
            return id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true);
        })
            .autocomplete(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                return [2 /*return*/, (0, util_1.autocompleteGiveawayId)({ prisma: prisma, itx: itx })];
            });
        }); })
            .addUser("user", function (user) {
            return user.setDescription("Użytkownik do usunięcia.").setRequired(true);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var giveaway, participant, channel, message;
            var prisma = _c.prisma;
            var id = _d.id, userToRemove = _d.user;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.giveaway.findFirst({
                            where: {
                                id: id,
                            },
                        })];
                    case 1:
                        giveaway = _e.sent();
                        if (!!giveaway) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ten giveaway nie istnieje!")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3:
                        if (!(itx.user.id !== giveaway.authorId)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie masz uprawnień do edytowania tego giveawaya!")];
                    case 4: return [2 /*return*/, _e.sent()];
                    case 5: return [4 /*yield*/, prisma.giveawayParticipant.findFirst({
                            where: { giveawayId: giveaway.id, userId: userToRemove.id },
                        })];
                    case 6:
                        participant = _e.sent();
                        if (!!participant) return [3 /*break*/, 8];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Ten użytkownik nie bierze udziału w giveawayu!")];
                    case 7: return [2 /*return*/, _e.sent()];
                    case 8: return [4 /*yield*/, prisma.giveawayParticipant.update({
                            where: { id: participant.id },
                            data: { forcefullyRemoved: true, isRemoved: true },
                        })];
                    case 9:
                        _e.sent();
                        return [4 /*yield*/, itx.reply({
                                content: "Pomy\u015Blnie usuni\u0119to ".concat(userToRemove, " z giveawaya!"),
                            })];
                    case 10:
                        _e.sent();
                        return [4 /*yield*/, itx.client.channels.fetch(giveaway.channelId)];
                    case 11:
                        channel = _e.sent();
                        if (!channel || !channel.isSendable()) {
                            throw new Error("Channel ".concat(channel, " is not sendable or not found."));
                        }
                        return [4 /*yield*/, channel.messages.fetch(giveaway.messageId)];
                    case 12:
                        message = _e.sent();
                        if (!message) {
                            throw new Error("Message ".concat(message, " not found."));
                        }
                        return [4 /*yield*/, (0, util_1.updateGiveaway)(message, giveaway, prisma)];
                    case 13:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("ready", function (_a, client_1) { return __awaiter(void 0, [_a, client_1], void 0, function (_b, client) {
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        client.on("interactionCreate", function (itx) { return __awaiter(void 0, void 0, void 0, function () {
            var giveaway, channel, message, participants, fmtParticipants, returnMsg, existing, _i, _a, roleId, _b, _c, roleId, joinResponse, leaveButtonClick;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!itx.isButton())
                            return [2 /*return*/];
                        // giveaway-option:optionId
                        if (!itx.customId.startsWith("giveaway-option:"))
                            return [2 /*return*/];
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        // To ensure user exists before trying to join to giveaway
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                    case 1:
                        // To ensure user exists before trying to join to giveaway
                        _d.sent();
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 2:
                        _d.sent();
                        return [4 /*yield*/, prisma.giveaway.findFirst({
                                where: {
                                    guildId: itx.message.guildId,
                                    channelId: itx.message.channelId,
                                    messageId: itx.message.id,
                                },
                            })];
                    case 3:
                        giveaway = _d.sent();
                        if (!!giveaway) return [3 /*break*/, 5];
                        return [4 /*yield*/, itx.followUp({
                                content: "Ten giveaway nie istnieje!",
                                flags: "Ephemeral",
                            })];
                    case 4: return [2 /*return*/, _d.sent()];
                    case 5: return [4 /*yield*/, client.channels.fetch(giveaway.channelId)];
                    case 6:
                        channel = _d.sent();
                        if (!channel || !channel.isSendable()) {
                            throw new Error("Channel ".concat(channel, " is not sendable or not found."));
                        }
                        return [4 /*yield*/, channel.messages.fetch(giveaway.messageId)];
                    case 7:
                        message = _d.sent();
                        if (!message) {
                            throw new Error("Message ".concat(message, " not found."));
                        }
                        if (!(giveaway.endAt <= itx.createdAt)) return [3 /*break*/, 9];
                        return [4 /*yield*/, itx.followUp({
                                content: "Ten giveaway już się zakończył!",
                                flags: "Ephemeral",
                            })];
                    case 8: return [2 /*return*/, _d.sent()];
                    case 9:
                        if (!itx.customId.endsWith("list")) return [3 /*break*/, 12];
                        return [4 /*yield*/, prisma.giveawayParticipant.findMany({
                                where: { giveawayId: giveaway.id, isRemoved: false },
                            })];
                    case 10:
                        participants = _d.sent();
                        fmtParticipants = participants.length > 0
                            ? participants.map(function (user) { return "<@".concat(user.userId, ">"); }).join(", ")
                            : "Brak uczestników";
                        return [4 /*yield*/, itx.followUp({
                                content: "Uczestnicy: ".concat(fmtParticipants),
                                flags: "Ephemeral",
                            })];
                    case 11:
                        _d.sent();
                        return [2 /*return*/];
                    case 12:
                        if (!!itx.customId.endsWith("join")) return [3 /*break*/, 14];
                        return [4 /*yield*/, itx.followUp({
                                content: "unexpected road: ".concat(giveaway.messageId),
                                flags: "Ephemeral",
                            })];
                    case 13:
                        _d.sent();
                        return [2 /*return*/];
                    case 14:
                        returnMsg = "Już jesteś uczestnikiem do tego giveaway!";
                        return [4 /*yield*/, prisma.giveawayParticipant.findFirst({
                                where: { userId: itx.user.id, giveawayId: giveaway.id },
                            })];
                    case 15:
                        existing = _d.sent();
                        if (!(existing === null || existing === void 0 ? void 0 : existing.forcefullyRemoved)) return [3 /*break*/, 17];
                        return [4 /*yield*/, itx.followUp({
                                content: "Usunięto cię z giveawayu i nie możesz już do niego dołączyć.",
                                flags: "Ephemeral",
                            })];
                    case 16:
                        _d.sent();
                        return [2 /*return*/];
                    case 17:
                        if (!(!existing || existing.isRemoved)) return [3 /*break*/, 31];
                        _i = 0, _a = giveaway.roleWhitelist;
                        _d.label = 18;
                    case 18:
                        if (!(_i < _a.length)) return [3 /*break*/, 21];
                        roleId = _a[_i];
                        if (!!itx.member.roles.cache.has(roleId)) return [3 /*break*/, 20];
                        return [4 /*yield*/, itx.followUp({
                                content: "Musisz posiada\u0107 rol\u0119 <@&".concat(roleId, ">, aby wzi\u0105\u0107 udzia\u0142 w giveawayu."),
                                flags: "Ephemeral",
                            })];
                    case 19:
                        _d.sent();
                        return [2 /*return*/];
                    case 20:
                        _i++;
                        return [3 /*break*/, 18];
                    case 21:
                        _b = 0, _c = giveaway.roleBlacklist;
                        _d.label = 22;
                    case 22:
                        if (!(_b < _c.length)) return [3 /*break*/, 25];
                        roleId = _c[_b];
                        if (!itx.member.roles.cache.has(roleId)) return [3 /*break*/, 24];
                        return [4 /*yield*/, itx.followUp({
                                content: "Nie mo\u017Cesz posiada\u0107 roli <@&".concat(roleId, ">, aby wzi\u0105\u0107 udzia\u0142 w giveawayu."),
                                flags: "Ephemeral",
                            })];
                    case 23:
                        _d.sent();
                        return [2 /*return*/];
                    case 24:
                        _b++;
                        return [3 /*break*/, 22];
                    case 25:
                        if (!!existing) return [3 /*break*/, 27];
                        return [4 /*yield*/, prisma.giveawayParticipant.create({
                                data: {
                                    userId: itx.user.id,
                                    giveawayId: giveaway.id,
                                },
                            })];
                    case 26:
                        _d.sent();
                        return [3 /*break*/, 29];
                    case 27: return [4 /*yield*/, prisma.giveawayParticipant.update({
                            where: { id: existing.id },
                            data: { isRemoved: false },
                        })];
                    case 28:
                        _d.sent();
                        _d.label = 29;
                    case 29:
                        returnMsg = "".concat(itx.user, " do\u0142\u0105czy\u0142x\u015B do giveaway!");
                        return [4 /*yield*/, (0, util_1.updateGiveaway)(itx.message, giveaway, prisma)];
                    case 30:
                        _d.sent();
                        _d.label = 31;
                    case 31: return [4 /*yield*/, itx.followUp({
                            content: returnMsg,
                            components: [util_1.leaveButtonRow],
                        })];
                    case 32:
                        joinResponse = _d.sent();
                        if (!joinResponse) {
                            throw new Error("Failed to receive response from interaction reply");
                        }
                        return [4 /*yield*/, (0, singleUseButton_1.waitForButtonClick)(joinResponse, "leave_giveaway", { minutes: 1 }, function (interaction) { return interaction.user.id === itx.user.id; })];
                    case 33:
                        leaveButtonClick = _d.sent();
                        if (!leaveButtonClick.interaction)
                            return [2 /*return*/];
                        if (!(giveaway.endAt <= itx.createdAt)) return [3 /*break*/, 35];
                        return [4 /*yield*/, itx.followUp({
                                content: "Ten giveaway już się zakończył!",
                                flags: "Ephemeral",
                            })];
                    case 34:
                        _d.sent();
                        return [2 /*return*/];
                    case 35: 
                    // replying to original giveaway so user can jump to it instead of reply > reply > giveaway
                    return [4 /*yield*/, leaveButtonClick.interaction.deferReply({ flags: "Ephemeral" })];
                    case 36:
                        // replying to original giveaway so user can jump to it instead of reply > reply > giveaway
                        _d.sent();
                        return [4 /*yield*/, leaveButtonClick.interaction.deleteReply()];
                    case 37:
                        _d.sent();
                        return [4 /*yield*/, prisma.giveawayParticipant.updateMany({
                                where: { userId: itx.user.id, giveawayId: giveaway.id, isRemoved: false },
                                data: { isRemoved: true },
                            })];
                    case 38:
                        _d.sent();
                        return [4 /*yield*/, (0, util_1.updateGiveaway)(itx.message, giveaway, prisma)];
                    case 39:
                        _d.sent();
                        return [4 /*yield*/, itx.followUp({
                                content: "Opuściłxś giveaway.",
                                flags: "Ephemeral",
                            })];
                    case 40:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); });
