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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propositions = void 0;
var builders_1 = require("@discordjs/builders");
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var errorFollowUp_1 = require("../util/errorFollowUp");
var guildSettingsMeta_1 = require("../util/guildSettingsMeta");
var isEmojiValid = function (emoji, message) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, message.react(emoji)];
            case 1:
                _b.sent();
                return [2 /*return*/, true];
            case 2:
                _a = _b.sent();
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
var propositionRows = [
    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
        .setCustomId("proposition-content")
        .setLabel("Treść propozycji")
        .setRequired(true)
        .setPlaceholder("# Regulamin jest zły i szyny były złe.")
        .setStyle(discord_js_1.TextInputStyle.Paragraph)),
];
var complaintRows = [
    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
        .setCustomId("complaint-content")
        .setLabel("Treść skargi")
        .setRequired(true)
        .setPlaceholder("# XYZ powiedział mi, że jestem głupi.")
        .setStyle(discord_js_1.TextInputStyle.Paragraph)),
];
var questionRows = [
    new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
        .setCustomId("question-content")
        .setLabel("Treść pytania")
        .setRequired(true)
        .setPlaceholder("# Czy za XYZ są kary?")
        .setStyle(discord_js_1.TextInputStyle.Paragraph)),
];
var getContent = function (itx, type) {
    var fieldMap = {
        proposition: "proposition-content",
        complaint: "complaint-content",
        question: "question-content",
    };
    return itx.fields.getTextInputValue(fieldMap[type]);
};
var getChannelId = function (type, meta) {
    var channelsMap = {
        proposition: meta.propositionsChannelId,
        complaint: meta.complaintsChannelId,
        question: meta.questionsChannelId,
    };
    return channelsMap[type];
};
var getColors = function (type) {
    var colorsMap = {
        // #00C015
        proposition: [0, 192, 21],
        // #FF3B3C
        complaint: [255, 59, 60],
        // #000000
        question: [0, 0, 0],
    };
    return colorsMap[type];
};
exports.propositions = new core_1.Hashira({ name: "propositions" })
    .use(base_1.base)
    .command("propozycja", function (cmd) {
    return cmd.setDescription("Wyślij swoją propozycję").handle(function (_, __, itx) { return __awaiter(void 0, void 0, void 0, function () {
        var customId, propositionModal;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customId = "proposition-".concat(itx.user.id);
                    propositionModal = new discord_js_1.ModalBuilder()
                        .setTitle("Propozycja")
                        .setCustomId(customId)
                        .addComponents(propositionRows);
                    return [4 /*yield*/, itx.showModal(propositionModal)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .command("skarga", function (cmd) {
    return cmd.setDescription("Wyślij swoją skargę").handle(function (_, __, itx) { return __awaiter(void 0, void 0, void 0, function () {
        var customId, propositionModal;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customId = "complaint-".concat(itx.user.id);
                    propositionModal = new discord_js_1.ModalBuilder()
                        .setTitle("Skarga")
                        .setCustomId(customId)
                        .addComponents(complaintRows);
                    return [4 /*yield*/, itx.showModal(propositionModal)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .command("pytanie", function (cmd) {
    return cmd.setDescription("Zadaj pytanie").handle(function (_, __, itx) { return __awaiter(void 0, void 0, void 0, function () {
        var customId, propositionModal;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customId = "question-".concat(itx.user.id);
                    propositionModal = new discord_js_1.ModalBuilder()
                        .setTitle("Pytanie")
                        .setCustomId(customId)
                        .addComponents(questionRows);
                    return [4 /*yield*/, itx.showModal(propositionModal)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .group("propo-skargi", function (group) {
    return group
        .setDescription("Zarządzaj propozycjami i skargami")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addCommand("ustaw", function (cmd) {
        return cmd
            .setDescription("Ustaw kanały do propozycji, skarg i pytań")
            .addString("type", function (input) {
            return input
                .addChoices({ name: "Propozycje", value: "propositions" }, { name: "Skargi", value: "complaints" }, { name: "Pytania", value: "questions" })
                .setDescription("Wybierz typ kanału");
        })
            .addChannel("channel", function (input) {
            return input
                .setDescription("Kanał do propozycji i skarg")
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var change, chanenlType;
            var prisma = _c.prisma;
            var type = _d.type, channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        change = {};
                        if (type === "propositions")
                            change.propositionsChannelId = channel.id;
                        else if (type === "complaints")
                            change.complaintsChannelId = channel.id;
                        else if (type === "questions")
                            change.questionsChannelId = channel.id;
                        else
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nieprawidłowy typ kanału")];
                        return [4 /*yield*/, prisma.$transaction(function (tx) {
                                return (0, guildSettingsMeta_1.updateGuildSettingsMeta)(tx, itx.guildId, change);
                            })];
                    case 1:
                        _e.sent();
                        chanenlType = type === "propositions"
                            ? "propozycji"
                            : type === "complaints"
                                ? "skarg"
                                : "pytań";
                        return [4 /*yield*/, itx.reply("Kana\u0142 do ".concat(chanenlType, " ustawiony na ").concat((0, builders_1.channelMention)(channel.id)))];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("emojis", function (cmd) {
        return cmd
            .setDescription("Ustaw emoji, którę będą używane pod propozycjami")
            .addString("text", function (input) {
            return input.setDescription("Wprowadź emoji po kolei, oddzielone przecinkami, np. 👍,👎");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var emojis, message, _i, emojis_1, emoji, changes;
            var _e;
            var prisma = _c.prisma;
            var text = _d.text;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        emojis = text.split(",").map(function (emoji) { return emoji.trim(); });
                        if (emojis.length === 0)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie podano żadnych emoji")];
                        if (emojis.length >= 10)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Podano za dużo emoji")];
                        return [4 /*yield*/, ((_e = itx.channel) === null || _e === void 0 ? void 0 : _e.send("Checking if emojis are valid..."))];
                    case 1:
                        message = _f.sent();
                        if (!message)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Couldn't send message to check emoji validity")];
                        _i = 0, emojis_1 = emojis;
                        _f.label = 2;
                    case 2:
                        if (!(_i < emojis_1.length)) return [3 /*break*/, 5];
                        emoji = emojis_1[_i];
                        return [4 /*yield*/, isEmojiValid(emoji, message)];
                    case 3:
                        if (!(_f.sent())) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Emoji ".concat((0, builders_1.escapeMarkdown)(emoji), " jest nieprawid\u0142owe. Spr\u00F3buj ponownie."))];
                        }
                        _f.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        changes = { propositionsEmojis: emojis };
                        return [4 /*yield*/, prisma.$transaction(function (tx) {
                                return (0, guildSettingsMeta_1.updateGuildSettingsMeta)(tx, itx.guildId, changes);
                            })];
                    case 6:
                        _f.sent();
                        return [4 /*yield*/, itx.reply("Emoji propozycji ustawione na ".concat(emojis.join(", ")))];
                    case 7:
                        _f.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("settings", function (cmd) {
        return cmd
            .setDescription("Wyświetl ustawienia propozycji i skarg")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var meta, unset;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, guildSettingsMeta_1.getGuildSettingsMeta)(prisma, itx.guildId)];
                    case 1:
                        meta = _c.sent();
                        unset = [];
                        if (!meta.propositionsChannelId)
                            unset.push("Kanał do propozycji");
                        if (!meta.complaintsChannelId)
                            unset.push("Kanał do skarg");
                        if (!meta.questionsChannelId)
                            unset.push("Kanał do pytań");
                        if (!meta.propositionsEmojis)
                            unset.push("Emoji propozycji");
                        if (unset.length) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nast\u0119puj\u0105ce ustawienia nie zosta\u0142y ustawione: ".concat(unset.join(", ")))];
                        }
                        if (!meta.propositionsChannelId ||
                            !meta.complaintsChannelId ||
                            !meta.questionsChannelId ||
                            !meta.propositionsEmojis) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "To nie powinno się zdarzyć, ale coś poszło nie tak")];
                        }
                        return [4 /*yield*/, itx.reply([
                                "Ustawienia propozycji i skarg:",
                                "Kana\u0142 do propozycji: ".concat((0, builders_1.channelMention)(meta.propositionsChannelId)),
                                "Kana\u0142 do skarg: ".concat((0, builders_1.channelMention)(meta.complaintsChannelId)),
                                "Kana\u0142 do pyta\u0144: ".concat((0, builders_1.channelMention)(meta.questionsChannelId)),
                                "Emoji propozycji: ".concat(meta.propositionsEmojis.join(", ")),
                            ].join("\n"))];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("interactionCreate", function (_a, itx_1) { return __awaiter(void 0, [_a, itx_1], void 0, function (_b, itx) {
    var _c, type, userId, content, meta, channelId, webhook, message;
    var prisma = _b.prisma;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!itx.inCachedGuild())
                    return [2 /*return*/];
                if (!itx.isModalSubmit())
                    return [2 /*return*/];
                _c = itx.customId.split("-"), type = _c[0], userId = _c[1];
                if (!type || !userId)
                    return [2 /*return*/];
                if (userId !== itx.user.id)
                    return [2 /*return*/];
                if (type !== "proposition" && type !== "complaint" && type !== "question")
                    return [2 /*return*/];
                return [4 /*yield*/, itx.deferReply()];
            case 1:
                _d.sent();
                content = getContent(itx, type);
                if (!content)
                    return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie podano treści formularza")];
                return [4 /*yield*/, (0, guildSettingsMeta_1.getGuildSettingsMeta)(prisma, itx.guildId)];
            case 2:
                meta = _d.sent();
                channelId = getChannelId(type, meta);
                if (!channelId)
                    return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Kanał do zgłoszeń nie został ustawiony")];
                if (!meta.propositionsEmojis) {
                    return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Emoji propozycji nie zostały ustawione")];
                }
                return [4 /*yield*/, itx.guild.channels.createWebhook({
                        channel: channelId,
                        name: itx.user.username,
                        avatar: itx.user.displayAvatarURL(),
                        reason: "Utworzenie webhooka do propozycji/skarg/pytań",
                    })];
            case 3:
                webhook = _d.sent();
                return [4 /*yield*/, webhook.send({
                        embeds: [
                            new builders_1.EmbedBuilder()
                                .setDescription(content)
                                .setColor(getColors(type))
                                .setFooter({ text: itx.user.id, iconURL: itx.user.displayAvatarURL() }),
                        ],
                    })];
            case 4:
                message = _d.sent();
                return [4 /*yield*/, Promise.all(__spreadArray(__spreadArray([], meta.propositionsEmojis.map(function (emoji) { return message.react(emoji); }), true), [
                        message.startThread({ name: "Dyskusja" }),
                        itx.editReply("Zg\u0142oszenie zosta\u0142o wys\u0142ane na ".concat((0, builders_1.channelMention)(channelId))),
                        webhook.delete("Usunięcie webhooka"),
                    ], false))];
            case 5:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
