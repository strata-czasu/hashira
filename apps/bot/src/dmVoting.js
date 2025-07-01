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
exports.dmVoting = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var discordTry_1 = require("./util/discordTry");
var ensureUsersExist_1 = require("./util/ensureUsersExist");
var errorFollowUp_1 = require("./util/errorFollowUp");
var fetchMembers_1 = require("./util/fetchMembers");
var hastebin_1 = require("./util/hastebin");
var numberToEmoji_1 = require("./util/numberToEmoji");
var parseUsers_1 = require("./util/parseUsers");
var pluralize_1 = require("./util/pluralize");
var getPollCreateOrUpdateActionRows = function (poll) {
    if (poll === void 0) { poll = null; }
    var titleInput = new discord_js_1.TextInputBuilder()
        .setCustomId("title")
        .setLabel("Nazwa (dla administracji)")
        .setPlaceholder("Głosowanie na Użytkownika Miesiąca")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(50)
        .setStyle(discord_js_1.TextInputStyle.Short);
    var contentInput = new discord_js_1.TextInputBuilder()
        .setCustomId("content")
        .setLabel("Treść (dla użytkownika)")
        .setPlaceholder("Kto powinien zostać Użytkownikiem Miesiąca?")
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1024)
        .setStyle(discord_js_1.TextInputStyle.Paragraph);
    var firstRowInput = new discord_js_1.TextInputBuilder()
        .setCustomId("row1")
        .setLabel("Pierwszy rząd opcji")
        .setPlaceholder("Użytkownik 1\nUżytkownik 2\nUżytkownik 3")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(256)
        .setStyle(discord_js_1.TextInputStyle.Paragraph);
    if (poll) {
        titleInput.setValue(poll.title);
        contentInput.setValue(poll.content);
        var firstRowOptions = poll.options
            .filter(function (it) { return it.row === 0; })
            .map(function (_a) {
            var option = _a.option;
            return option;
        });
        firstRowInput.setValue(firstRowOptions.join("\n"));
    }
    var inputs = [titleInput, contentInput, firstRowInput];
    return inputs.map(function (input) {
        return new discord_js_1.ActionRowBuilder().setComponents(input);
    });
};
var getDmPollStatus = function (poll) {
    if (poll.startedAt && poll.finishedAt) {
        return "zakończone";
    }
    if (poll.startedAt && !poll.finishedAt) {
        return "w trakcie";
    }
    if (!poll.startedAt && !poll.finishedAt) {
        return "nie rozpoczęte";
    }
    return "błędny status";
};
// TODO)) Move this to a more appropriate location
var parseButtonStyle = function (style) {
    return {
        primary: discord_js_1.ButtonStyle.Primary,
        secondary: discord_js_1.ButtonStyle.Secondary,
        success: discord_js_1.ButtonStyle.Success,
        danger: discord_js_1.ButtonStyle.Danger,
        link: discord_js_1.ButtonStyle.Link,
        premium: discord_js_1.ButtonStyle.Premium,
    }[style];
};
exports.dmVoting = new core_1.Hashira({ name: "dmVoting" })
    .use(base_1.base)
    .group("glosowanie-dm", function (group) {
    return group
        .setDescription("Głosowania w wiadomościach prywatnych")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
        .addCommand("utworz", function (command) {
        return command
            .setDescription("Utwórz nowe głosowanie")
            .handle(function (_a, _params_1, itx_1) { return __awaiter(void 0, [_a, _params_1, itx_1], void 0, function (_b, _params, itx) {
            var customId, modal, submitAction, title, content, rawOptions, firstRowOptions, secondRowOptions, options, poll, lines;
            var _c;
            var _d, _e, _f, _g, _h, _j;
            var prisma = _b.prisma;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        customId = "new-poll-".concat(itx.user.id);
                        modal = (_c = new discord_js_1.ModalBuilder()
                            .setCustomId(customId)
                            .setTitle("Nowe głosowanie"))
                            .addComponents.apply(_c, getPollCreateOrUpdateActionRows());
                        return [4 /*yield*/, itx.showModal(modal)];
                    case 1:
                        _k.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                                return itx.awaitModalSubmit({
                                    time: 60000 * 10,
                                    filter: function (modal) { return modal.customId === customId; },
                                });
                            }, [discord_js_1.DiscordjsErrorCodes.InteractionCollectorError], function () { return null; })];
                    case 2:
                        submitAction = _k.sent();
                        if (!submitAction)
                            return [2 /*return*/];
                        return [4 /*yield*/, submitAction.deferReply()];
                    case 3:
                        _k.sent();
                        title = (_e = (_d = submitAction.components
                            .at(0)) === null || _d === void 0 ? void 0 : _d.components.find(function (c) { return c.customId === "title"; })) === null || _e === void 0 ? void 0 : _e.value;
                        content = (_g = (_f = submitAction.components
                            .at(1)) === null || _f === void 0 ? void 0 : _f.components.find(function (c) { return c.customId === "content"; })) === null || _g === void 0 ? void 0 : _g.value;
                        rawOptions = (_j = (_h = submitAction.components
                            .at(2)) === null || _h === void 0 ? void 0 : _h.components.find(function (c) { return c.customId === "row1"; })) === null || _j === void 0 ? void 0 : _j.value;
                        if (!(!title || !content || !rawOptions)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nie podano wszystkich wymaganych danych!")];
                    case 4: return [2 /*return*/, _k.sent()];
                    case 5:
                        firstRowOptions = rawOptions
                            .split("\n")
                            .map(function (option) { return option.trim(); });
                        if (!(firstRowOptions.length > 5)) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Podano za dużo opcji odpowiedzi. Maksymalna liczba to 5.")];
                    case 6: return [2 /*return*/, _k.sent()];
                    case 7:
                        secondRowOptions = [
                            {
                                option: "Pusty głos",
                                row: 1,
                                style: "primary",
                                emoji: "🤐",
                            },
                            {
                                option: "Usuń mnie z kolejnych głosowań",
                                row: 1,
                                isOptOut: true,
                                style: "danger",
                                emoji: "🚪",
                            },
                        ];
                        options = __spreadArray(__spreadArray([], firstRowOptions.map(function (option) { return ({ option: option, row: 0 }); }), true), secondRowOptions, true);
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                    case 8:
                        _k.sent();
                        return [4 /*yield*/, prisma.dmPoll.create({
                                data: {
                                    createdById: itx.user.id,
                                    title: title,
                                    content: content,
                                    options: {
                                        createMany: {
                                            data: options,
                                        },
                                    },
                                },
                            })];
                    case 9:
                        poll = _k.sent();
                        lines = [
                            "Utworzono g\u0142osowanie ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "] z ").concat((0, discord_js_1.bold)(firstRowOptions.length.toString()), " opcjami."),
                            "Dodano te\u017C domy\u015Blne opcje \"Pusty g\u0142os\" i \"Usu\u0144 mnie z kolejnych g\u0142osowa\u0144\".\n",
                            "Mo\u017Cesz edytowa\u0107 je przez `/glosowanie-dm edytuj ".concat(poll.id.toString(), "`"),
                            "Rozpocznij g\u0142osowanie przez `/glosowanie-dm rozpocznij ".concat(poll.id.toString(), " @rola-wyborcy`"),
                            "Po rozpocz\u0119ciu mo\u017Cesz sprawdzi\u0107 je przez `/glosowanie-dm sprawdz ".concat(poll.id.toString(), "`"),
                            "Je\u015Bli potrzebujesz, mo\u017Cesz usun\u0105\u0107 je przez `/glosowanie-dm usun ".concat(poll.id.toString(), "`"),
                        ];
                        return [4 /*yield*/, submitAction.editReply(lines.join("\n"))];
                    case 10:
                        _k.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edytuj", function (command) {
        return command
            .setDescription("Edytuj głosowanie")
            .addInteger("id", function (id) { return id.setDescription("ID głosowania"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var poll, customId, modal, submitAction, title, content, rawFirstRowOptions, firstRowOptions, options;
            var _e;
            var _f, _g, _h, _j, _k, _l;
            var prisma = _c.prisma;
            var id = _d.id;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.dmPoll.findFirst({
                                where: { id: id },
                                include: { options: true },
                            })];
                    case 1:
                        poll = _m.sent();
                        if (!(poll === null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono głosowania o podanym ID")];
                    case 2: return [2 /*return*/, _m.sent()];
                    case 3:
                        if (!poll.startedAt) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie można edytować rozpoczętego głosowania")];
                    case 4: return [2 /*return*/, _m.sent()];
                    case 5:
                        customId = "edit-poll-".concat(poll.id);
                        modal = (_e = new discord_js_1.ModalBuilder()
                            .setCustomId(customId)
                            .setTitle("Edycja g\u0142osowania [".concat(poll.id, "]")))
                            .addComponents.apply(_e, getPollCreateOrUpdateActionRows(poll));
                        return [4 /*yield*/, itx.showModal(modal)];
                    case 6:
                        _m.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                                return itx.awaitModalSubmit({
                                    time: 60000 * 10,
                                    filter: function (modal) { return modal.customId === customId; },
                                });
                            }, [discord_js_1.DiscordjsErrorCodes.InteractionCollectorError], function () { return null; })];
                    case 7:
                        submitAction = _m.sent();
                        if (!submitAction)
                            return [2 /*return*/];
                        return [4 /*yield*/, submitAction.deferReply()];
                    case 8:
                        _m.sent();
                        title = (_g = (_f = submitAction.components
                            .at(0)) === null || _f === void 0 ? void 0 : _f.components.find(function (c) { return c.customId === "title"; })) === null || _g === void 0 ? void 0 : _g.value;
                        content = (_j = (_h = submitAction.components
                            .at(1)) === null || _h === void 0 ? void 0 : _h.components.find(function (c) { return c.customId === "content"; })) === null || _j === void 0 ? void 0 : _j.value;
                        rawFirstRowOptions = (_l = (_k = submitAction.components
                            .at(2)) === null || _k === void 0 ? void 0 : _k.components.find(function (c) { return c.customId === "row1"; })) === null || _l === void 0 ? void 0 : _l.value;
                        if (!(!title || !content || !rawFirstRowOptions)) return [3 /*break*/, 10];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nie podano wszystkich wymaganych danych!")];
                    case 9: return [2 /*return*/, _m.sent()];
                    case 10:
                        firstRowOptions = rawFirstRowOptions
                            .split("\n")
                            .map(function (option) { return option.trim(); });
                        if (!(firstRowOptions.length > 5)) return [3 /*break*/, 12];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Podano za dużo opcji odpowiedzi. Maksymalna liczba to 5.")];
                    case 11: return [2 /*return*/, _m.sent()];
                    case 12:
                        options = firstRowOptions.map(function (option) { return ({ option: option, row: 0 }); });
                        return [4 /*yield*/, prisma.dmPoll.update({
                                where: { id: id },
                                data: {
                                    title: title,
                                    content: content,
                                    options: {
                                        deleteMany: {
                                            id: {
                                                in: poll.options
                                                    .filter(function (option) { return option.row === 0; })
                                                    .map(function (option) { return option.id; }),
                                            },
                                        },
                                        createMany: { data: options },
                                    },
                                },
                            })];
                    case 13:
                        _m.sent();
                        return [4 /*yield*/, submitAction.editReply("Zaktualizowano g\u0142osowanie ".concat((0, discord_js_1.italic)(title), " z ").concat((0, discord_js_1.bold)(options.length.toString()), " opcjami."))];
                    case 14:
                        _m.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("lista", function (command) {
        return command
            .setDescription("Wyświetl listę głosowań")
            .handle(function (_a, _params_1, itx_1) { return __awaiter(void 0, [_a, _params_1, itx_1], void 0, function (_b, _params, itx) {
            var where, paginator, formatPoll, view;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = { deletedAt: null };
                        paginator = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.dmPoll.findMany(__assign(__assign({}, props), { where: where, orderBy: { createdAt: createdAt }, include: { options: true } }));
                        }, function () { return prisma.dmPoll.count({ where: where }); }, { pageSize: 4, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatPoll = function (poll, _idx) {
                            var lines = [
                                "### ".concat(poll.title, " [").concat(getDmPollStatus(poll), "] [").concat(poll.id, "]"),
                            ];
                            if (poll.startedAt) {
                                lines.push("**Rozpocz\u0119to**: ".concat((0, discord_js_1.time)(poll.startedAt, discord_js_1.TimestampStyles.ShortDateTime)));
                            }
                            if (poll.finishedAt) {
                                lines.push("**Zako\u0144czono**: ".concat((0, discord_js_1.time)(poll.finishedAt, discord_js_1.TimestampStyles.ShortDateTime)));
                            }
                            var firstRowOptions = poll.options.filter(function (o) { return o.row === 0; });
                            lines.push("**Opcje (".concat(firstRowOptions.length.toString(), ")**: ").concat(firstRowOptions
                                .map(function (o) { return o.option; })
                                .join(", ")));
                            var secondRowOptions = poll.options.filter(function (o) { return o.row === 1; });
                            if (secondRowOptions.length > 0) {
                                lines.push("**Opcje (".concat(secondRowOptions.length.toString(), ")**: ").concat(secondRowOptions
                                    .map(function (o) { return o.option; })
                                    .join(", ")));
                            }
                            lines.push("**Tre\u015B\u0107**: ".concat((0, discord_js_1.italic)(poll.content)));
                            return lines.join("\n");
                        };
                        view = new core_1.PaginatedView(paginator, "Głosowania DM", formatPoll, true);
                        return [4 /*yield*/, view.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("sprawdz", function (command) {
        return command
            .setDescription("Sprawdź szczegóły głosowania")
            .addInteger("id", function (id) { return id.setDescription("ID głosowania"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var poll, embed, perRowOptions, _i, _e, option, row, _f, perRowOptions_1, _g, row, options, totalVotes, optionResults, _h, _j, option, percentage, votingUsersHastebinUrl, eliglibleParticipants, votedPercentage, notYetVoted, hastebinUrl, notYetVotedPercentage, failedParticipants, hastebinUrl;
            var _k;
            var prisma = _c.prisma;
            var id = _d.id;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.dmPoll.findFirst({
                                where: { id: id },
                                include: {
                                    options: {
                                        include: { votes: true },
                                        orderBy: [{ row: "asc" }, { id: "asc" }],
                                    },
                                    participants: true,
                                },
                            })];
                    case 1:
                        poll = _l.sent();
                        if (!(poll === null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono głosowania o podanym ID")];
                    case 2: return [2 /*return*/, _l.sent()];
                    case 3: return [4 /*yield*/, itx.deferReply()];
                    case 4:
                        _l.sent();
                        embed = new discord_js_1.EmbedBuilder()
                            .setTitle("G\u0142osowanie ".concat(poll.title, " [").concat(getDmPollStatus(poll), "]"))
                            .setDescription(poll.content)
                            .setFooter({ text: "ID: ".concat(poll.id) });
                        if (!!poll.startedAt) return [3 /*break*/, 5];
                        perRowOptions = new Map();
                        for (_i = 0, _e = poll.options; _i < _e.length; _i++) {
                            option = _e[_i];
                            row = (_k = perRowOptions.get(option.row)) !== null && _k !== void 0 ? _k : [];
                            perRowOptions.set(option.row, __spreadArray(__spreadArray([], row, true), [option.option], false));
                        }
                        for (_f = 0, perRowOptions_1 = perRowOptions; _f < perRowOptions_1.length; _f++) {
                            _g = perRowOptions_1[_f], row = _g[0], options = _g[1];
                            embed.addFields([
                                {
                                    name: "Opcje (rz\u0105d ".concat(row + 1, ")"),
                                    value: options.map(function (option) { return (0, discord_js_1.bold)(option); }).join("\n"),
                                },
                            ]);
                        }
                        return [3 /*break*/, 13];
                    case 5:
                        if (!poll.startedAt) return [3 /*break*/, 13];
                        totalVotes = poll.options.reduce(function (acc, option) { return acc + option.votes.length; }, 0);
                        optionResults = [];
                        _h = 0, _j = poll.options;
                        _l.label = 6;
                    case 6:
                        if (!(_h < _j.length)) return [3 /*break*/, 9];
                        option = _j[_h];
                        percentage = totalVotes === 0 ? 0 : (option.votes.length / totalVotes) * 100;
                        return [4 /*yield*/, (0, hastebin_1.hastebin)(option.votes.map(function (_a) {
                                var userId = _a.userId;
                                return userId;
                            }).join("\n"))];
                    case 7:
                        votingUsersHastebinUrl = _l.sent();
                        if (option.votes.length === 0) {
                            optionResults.push("".concat((0, discord_js_1.bold)(option.option), ": ").concat(option.votes.length, " (").concat(percentage.toFixed(1), "%)"));
                        }
                        else {
                            optionResults.push("".concat((0, discord_js_1.bold)(option.option), ": [").concat(option.votes.length, "](").concat(votingUsersHastebinUrl, ") (").concat(percentage.toFixed(1), "%)"));
                        }
                        _l.label = 8;
                    case 8:
                        _h++;
                        return [3 /*break*/, 6];
                    case 9:
                        eliglibleParticipants = poll.participants.filter(function (p) { return p.messageId !== null; });
                        votedPercentage = (totalVotes / eliglibleParticipants.length) * 100;
                        embed.addFields([
                            {
                                name: "Odpowiedzi - ".concat(totalVotes, "/").concat(eliglibleParticipants.length, " (").concat(votedPercentage.toFixed(1), "%)"),
                                value: optionResults.join("\n"),
                            },
                        ]);
                        if (!(totalVotes < eliglibleParticipants.length)) return [3 /*break*/, 11];
                        notYetVoted = eliglibleParticipants.filter(function (p) {
                            return !poll.options
                                .flatMap(function (o) { return o.votes; })
                                .some(function (v) { return v.userId === p.userId; });
                        });
                        return [4 /*yield*/, (0, hastebin_1.hastebin)(notYetVoted.map(function (_a) {
                                var userId = _a.userId;
                                return userId;
                            }).join("\n"))];
                    case 10:
                        hastebinUrl = _l.sent();
                        notYetVotedPercentage = (notYetVoted.length / eliglibleParticipants.length) * 100;
                        embed.addFields([
                            {
                                name: "Nie oddano g\u0142osu - ".concat(notYetVoted.length, "/").concat(eliglibleParticipants.length, " (").concat(notYetVotedPercentage.toFixed(1), "%)"),
                                value: hastebinUrl,
                            },
                        ]);
                        _l.label = 11;
                    case 11:
                        failedParticipants = poll.participants.filter(function (p) { return p.messageId === null; });
                        if (!(failedParticipants.length > 0)) return [3 /*break*/, 13];
                        return [4 /*yield*/, (0, hastebin_1.hastebin)(failedParticipants.map(function (_a) {
                                var userId = _a.userId;
                                return userId;
                            }).join("\n"))];
                    case 12:
                        hastebinUrl = _l.sent();
                        embed.addFields([
                            {
                                name: "Nieotrzymane wiadomo\u015Bci (".concat(failedParticipants.length, ")"),
                                value: hastebinUrl,
                            },
                        ]);
                        _l.label = 13;
                    case 13: return [4 /*yield*/, itx.editReply({ embeds: [embed] })];
                    case 14:
                        _l.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("rozpocznij", function (command) {
        return command
            .setDescription("Rozpocznij głosowanie")
            .addInteger("id", function (id) { return id.setDescription("ID głosowania"); })
            .addRole("rola", function (role) {
            return role.setDescription("Rola, w której użytkownicy mogą głosować");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var poll, firstRowOptions, firstRowButtons, secondRowOptions, secondRowButtons, firstRowActionRow, secondRowActionRow, excludedUserIds, eliglibleParticipants, messageSendStatuses, successfullySentMessages, _i, successfullySentMessages_1, _e, member, messageId, lines, failedToSendMessages, failedToSendMembersHastebinUrl;
            var _f, _g;
            var prisma = _c.prisma;
            var id = _d.id, role = _d.rola;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.dmPoll.findFirst({
                                where: { id: id },
                                include: {
                                    options: {
                                        include: { votes: true },
                                        orderBy: [{ row: "asc" }, { id: "asc" }],
                                    },
                                },
                            })];
                    case 1:
                        poll = _h.sent();
                        if (!(poll === null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono głosowania o podanym ID")];
                    case 2: return [2 /*return*/, _h.sent()];
                    case 3:
                        if (!poll.startedAt) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "G\u0142osowanie zosta\u0142o ju\u017C rozpocz\u0119te (".concat((0, discord_js_1.time)(poll.startedAt, discord_js_1.TimestampStyles.LongDateTime), ")"))];
                    case 4: return [2 /*return*/, _h.sent()];
                    case 5:
                        if (!poll.finishedAt) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "G\u0142osowanie zosta\u0142o ju\u017C zako\u0144czone (".concat((0, discord_js_1.time)(poll.finishedAt, discord_js_1.TimestampStyles.LongDateTime), ")"))];
                    case 6: return [2 /*return*/, _h.sent()];
                    case 7:
                        firstRowOptions = poll.options.filter(function (o) { return o.row === 0; });
                        firstRowButtons = firstRowOptions.map(function (option, i) {
                            var _a;
                            return new discord_js_1.ButtonBuilder()
                                .setLabel(option.option)
                                .setCustomId("vote-option:".concat(option.id))
                                .setStyle(parseButtonStyle(option.style))
                                .setEmoji((_a = option.emoji) !== null && _a !== void 0 ? _a : (0, numberToEmoji_1.numberToEmoji)(i + 1));
                        });
                        secondRowOptions = poll.options.filter(function (o) { return o.row === 1; });
                        secondRowButtons = secondRowOptions.map(function (option, i) {
                            var _a;
                            return new discord_js_1.ButtonBuilder()
                                .setLabel(option.option)
                                .setCustomId("vote-option:".concat(option.id))
                                .setStyle(parseButtonStyle(option.style))
                                .setEmoji((_a = option.emoji) !== null && _a !== void 0 ? _a : (0, numberToEmoji_1.numberToEmoji)(firstRowOptions.length + i + 1));
                        });
                        firstRowActionRow = (_f = new discord_js_1.ActionRowBuilder()).addComponents.apply(_f, firstRowButtons);
                        secondRowActionRow = (_g = new discord_js_1.ActionRowBuilder()).addComponents.apply(_g, secondRowButtons);
                        return [4 /*yield*/, itx.deferReply()];
                    case 8:
                        _h.sent();
                        return [4 /*yield*/, itx.guild.members.fetch()];
                    case 9:
                        _h.sent();
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, role.members.map(function (m) { return m.id; }))];
                    case 10:
                        _h.sent();
                        return [4 /*yield*/, prisma.dmPollExclusion.findMany()];
                    case 11:
                        excludedUserIds = (_h.sent()).map(function (e) { return e.userId; });
                        eliglibleParticipants = role.members.filter(function (m) { return !excludedUserIds.includes(m.id); });
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.dmPoll.update({
                                                where: { id: id },
                                                data: { startedAt: itx.createdAt },
                                            })];
                                        case 1:
                                            _a.sent();
                                            // Save all eligible participants with empty message IDs
                                            return [4 /*yield*/, tx.dmPollParticipant.createMany({
                                                    data: eliglibleParticipants.map(function (member) { return ({
                                                        pollId: poll.id,
                                                        userId: member.id,
                                                        messageId: null,
                                                    }); }),
                                                })];
                                        case 2:
                                            // Save all eligible participants with empty message IDs
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 12:
                        _h.sent();
                        // Notify that the vote has started, but send messages in the background
                        return [4 /*yield*/, itx.editReply("Rozpocz\u0119to g\u0142osowanie ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]. Wysy\u0142anie wiadomo\u015Bci do u\u017Cytkownik\u00F3w... (mo\u017Ce to zaj\u0105\u0107 par\u0119 minut)"))];
                    case 13:
                        // Notify that the vote has started, but send messages in the background
                        _h.sent();
                        return [4 /*yield*/, Promise.all(eliglibleParticipants.map(function (member) { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                            var message;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, member.send({
                                                            content: poll.content,
                                                            components: [firstRowActionRow, secondRowActionRow],
                                                        })];
                                                    case 1:
                                                        message = _a.sent();
                                                        return [2 /*return*/, { member: member, messageId: message.id }];
                                                }
                                            });
                                        }); }, [discord_js_1.RESTJSONErrorCodes.CannotSendMessagesToThisUser], function () { return ({ member: member, messageId: null }); })];
                                });
                            }); }))];
                    case 14:
                        messageSendStatuses = _h.sent();
                        successfullySentMessages = messageSendStatuses.filter(function (m) { return m.messageId !== null; });
                        _i = 0, successfullySentMessages_1 = successfullySentMessages;
                        _h.label = 15;
                    case 15:
                        if (!(_i < successfullySentMessages_1.length)) return [3 /*break*/, 18];
                        _e = successfullySentMessages_1[_i], member = _e.member, messageId = _e.messageId;
                        return [4 /*yield*/, prisma.dmPollParticipant.update({
                                where: { pollId_userId: { pollId: poll.id, userId: member.id } },
                                data: { messageId: messageId },
                            })];
                    case 16:
                        _h.sent();
                        _h.label = 17;
                    case 17:
                        _i++;
                        return [3 /*break*/, 15];
                    case 18:
                        lines = [
                            "Rozes\u0142ano wiadomo\u015Bci do g\u0142osowania ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]. Wys\u0142ano wiadomo\u015B\u0107 do ").concat((0, discord_js_1.bold)(successfullySentMessages.length.toString()), "/").concat((0, discord_js_1.bold)(messageSendStatuses.length.toString()), " u\u017Cytkownik\u00F3w."),
                        ];
                        if (excludedUserIds.length > 0) {
                            lines.push("Wykluczono ".concat((0, discord_js_1.bold)(excludedUserIds.length.toString()), " u\u017Cytkownik\u00F3w z g\u0142osowania (wypisani)."));
                        }
                        if (!(successfullySentMessages.length < messageSendStatuses.length)) return [3 /*break*/, 21];
                        failedToSendMessages = messageSendStatuses.filter(function (m) { return m.messageId === null; });
                        lines.push("Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat(failedToSendMessages.length, " u\u017Cytkownik\u00F3w:"));
                        if (!(failedToSendMessages.length <= 20)) return [3 /*break*/, 19];
                        lines.push(failedToSendMessages
                            .map(function (_a) {
                            var member = _a.member;
                            return "".concat(member.user.tag, " ").concat(member.user.id);
                        })
                            .join("\n"));
                        return [3 /*break*/, 21];
                    case 19: return [4 /*yield*/, (0, hastebin_1.hastebin)(failedToSendMessages
                            .map(function (_a) {
                            var member = _a.member;
                            return "".concat(member.user.tag, " ").concat(member.user.id);
                        })
                            .join("\n"))];
                    case 20:
                        failedToSendMembersHastebinUrl = _h.sent();
                        lines.push(failedToSendMembersHastebinUrl);
                        _h.label = 21;
                    case 21: return [4 /*yield*/, itx.user.createDM()];
                    case 22:
                        _h.sent();
                        if (!itx.user.dmChannel)
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.user.dmChannel.send(lines.join("\n"))];
                    case 23:
                        _h.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("przypomnij", function (command) {
        return command
            .setDescription("Przypomnij o głosowaniu użytkownikom, którzy jeszcze nie zagłosowali")
            .addInteger("id", function (id) { return id.setDescription("ID głosowania"); })
            .addString("content", function (content) {
            return content
                .setDescription("Niestandardowa treść przypomnienia")
                .setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var poll, excludedUserIds, members, messageSendStatuses, successfullySentMessages, lines, failedToSendMessages;
            var prisma = _c.prisma;
            var id = _d.id, providedContent = _d.content;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.dmPoll.findFirst({
                                where: { id: id },
                                include: {
                                    participants: true,
                                    options: {
                                        include: { votes: true },
                                    },
                                },
                            })];
                    case 1:
                        poll = _e.sent();
                        if (!(poll === null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono głosowania o podanym ID")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3:
                        if (!!poll.startedAt) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Głosowanie nie zostało jeszcze rozpoczęte.")];
                    case 4: return [2 /*return*/, _e.sent()];
                    case 5:
                        if (!poll.finishedAt) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "G\u0142osowanie zosta\u0142o ju\u017C zako\u0144czone (".concat((0, discord_js_1.time)(poll.finishedAt, discord_js_1.TimestampStyles.LongDateTime), ")"))];
                    case 6: return [2 /*return*/, _e.sent()];
                    case 7: return [4 /*yield*/, itx.deferReply()];
                    case 8:
                        _e.sent();
                        return [4 /*yield*/, prisma.dmPollExclusion.findMany()];
                    case 9:
                        excludedUserIds = (_e.sent()).map(function (e) { return e.userId; });
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, poll.participants
                                .filter(function (p) {
                                return !poll.options
                                    .flatMap(function (o) { return o.votes; })
                                    .some(function (v) { return v.userId === p.userId; });
                            })
                                .filter(function (p) { return !excludedUserIds.includes(p.userId); })
                                .map(function (p) { return p.userId; }))];
                    case 10:
                        members = _e.sent();
                        return [4 /*yield*/, Promise.all(members.map(function (member) { return __awaiter(void 0, void 0, void 0, function () {
                                var participant, messageId, channel;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            participant = poll.participants.find(function (p) { return p.userId === member.id && p.messageId !== null; });
                                            if (!participant)
                                                return [2 /*return*/, { member: member, messageId: null }];
                                            messageId = participant.messageId;
                                            if (!messageId)
                                                return [2 /*return*/, { member: member, messageId: null }];
                                            return [4 /*yield*/, member.createDM()];
                                        case 1:
                                            channel = _a.sent();
                                            return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                                    var content, message;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0:
                                                                content = providedContent !== null && providedContent !== void 0 ? providedContent : "Hej ".concat((0, discord_js_1.userMention)(member.id), ", przypominam Ci o g\u0142osowaniu, bo Tw\u00F3j g\u0142os nie zosta\u0142 jeszcze oddany.");
                                                                return [4 /*yield*/, member.send({
                                                                        content: "".concat(content, "\nPrzejd\u017A do g\u0142osowania: ").concat((0, discord_js_1.messageLink)(channel.id, messageId), " i wybierz jedn\u0105 z opcji klikaj\u0105c w przycisk. Mi\u0142ego dnia! :heart:"),
                                                                        reply: { messageReference: messageId },
                                                                    })];
                                                            case 1:
                                                                message = _a.sent();
                                                                return [2 /*return*/, { member: member, messageId: message.id }];
                                                        }
                                                    });
                                                }); }, [discord_js_1.RESTJSONErrorCodes.CannotSendMessagesToThisUser], function () { return ({ member: member, messageId: null }); })];
                                        case 2: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }))];
                    case 11:
                        messageSendStatuses = _e.sent();
                        successfullySentMessages = messageSendStatuses.filter(function (m) { return m.messageId !== null; });
                        lines = [
                            "Wys\u0142ano przypomnienie o g\u0142osowaniu do ".concat((0, discord_js_1.bold)(successfullySentMessages.length.toString()), "/").concat((0, discord_js_1.bold)(messageSendStatuses.length.toString()), " u\u017Cytkownik\u00F3w."),
                        ];
                        if (successfullySentMessages.length < messageSendStatuses.length) {
                            failedToSendMessages = messageSendStatuses.filter(function (m) { return m.messageId === null; });
                            lines.push("Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do:\n".concat(failedToSendMessages
                                .map(function (_a) {
                                var member = _a.member;
                                return "".concat(member.user.tag, " ").concat(member.user.id);
                            })
                                .join("\n")));
                        }
                        return [4 /*yield*/, itx.editReply(lines.join("\n"))];
                    case 12:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("zakoncz", function (command) {
        return command
            .setDescription("Zakończ głosowanie")
            .addInteger("id", function (id) { return id.setDescription("ID głosowania"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var poll, dialog;
            var prisma = _c.prisma, lock = _c.lock;
            var id = _d.id;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, prisma.dmPoll.findFirst({
                                where: { id: id, startedAt: { not: null }, finishedAt: null },
                                include: { participants: true },
                            })];
                    case 2:
                        poll = _e.sent();
                        if (!(poll === null)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono aktywnego głosowania o podanym ID")];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4:
                        dialog = new core_1.ConfirmationDialog("Czy na pewno chcesz zako\u0144czy\u0107 g\u0142osowanie ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]?"), "Tak", "Nie", function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.dmPoll.update({
                                            where: { id: id },
                                            data: { finishedAt: itx.createdAt },
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, itx.editReply({
                                                content: "Zako\u0144czono g\u0142osowanie ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]. Usuwanie przycisk\u00F3w z wiadomo\u015Bci... (mo\u017Ce to zaj\u0105\u0107 par\u0119 minut)"),
                                                components: [],
                                            })];
                                    case 2:
                                        _a.sent();
                                        // Remove buttons and add a footer to all outgoing messages
                                        return [4 /*yield*/, Promise.all(poll.participants.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                                var userId = _b.userId, messageId = _b.messageId;
                                                return __generator(this, function (_c) {
                                                    switch (_c.label) {
                                                        case 0:
                                                            if (messageId === null)
                                                                return [2 /*return*/];
                                                            return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                                                    var user, message, content;
                                                                    return __generator(this, function (_a) {
                                                                        switch (_a.label) {
                                                                            case 0: return [4 /*yield*/, itx.client.users.fetch(userId)];
                                                                            case 1:
                                                                                user = _a.sent();
                                                                                return [4 /*yield*/, user.createDM()];
                                                                            case 2:
                                                                                _a.sent();
                                                                                if (!user.dmChannel)
                                                                                    return [2 /*return*/];
                                                                                return [4 /*yield*/, user.dmChannel.messages.fetch(messageId)];
                                                                            case 3:
                                                                                message = _a.sent();
                                                                                content = "".concat(message.content, "\n\n*G\u0142osowanie sko\u0144czy\u0142o si\u0119 ").concat((0, discord_js_1.time)(itx.createdAt, discord_js_1.TimestampStyles.RelativeTime), "*");
                                                                                return [4 /*yield*/, message.edit({ content: content, components: [] })];
                                                                            case 4:
                                                                                _a.sent();
                                                                                return [2 /*return*/];
                                                                        }
                                                                    });
                                                                }); }, [
                                                                    discord_js_1.RESTJSONErrorCodes.UnknownUser,
                                                                    discord_js_1.RESTJSONErrorCodes.UnknownChannel,
                                                                    discord_js_1.RESTJSONErrorCodes.UnknownMessage,
                                                                ], function () {
                                                                    console.log("Failed to delete message ".concat(messageId, " for user ").concat(userId));
                                                                })];
                                                        case 1:
                                                            _c.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); }))];
                                    case 3:
                                        // Remove buttons and add a footer to all outgoing messages
                                        _a.sent();
                                        return [4 /*yield*/, itx.user.createDM()];
                                    case 4:
                                        _a.sent();
                                        if (!itx.user.dmChannel)
                                            return [2 /*return*/];
                                        return [4 /*yield*/, itx.user.dmChannel.send("Zako\u0144czono g\u0142osowanie ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "] i usuni\u0119to przyciski z ").concat(poll.participants.length, " wiadomo\u015Bci."))];
                                    case 5:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, itx.editReply({
                                            content: "Anulowano zako\u0144czenie g\u0142osowania ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]"),
                                            components: [],
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, function (action) { return action.user.id === itx.user.id; }, function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, itx.editReply({
                                            content: "Anulowano zako\u0144czenie g\u0142osowania ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]"),
                                            components: [],
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, lock.run(["dmPollEnd_".concat(poll.id)], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, dialog.render({ send: itx.editReply.bind(itx) })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); }, function () {
                                return (0, errorFollowUp_1.errorFollowUp)(itx, "Ktoś już próbuje zakończyć to głosowanie. Spróbuj ponownie za chwilę.");
                            })];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("usun", function (command) {
        return command
            .setDescription("Usuń głosowanie")
            .addInteger("id", function (id) { return id.setDescription("ID głosowania"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var poll;
            var prisma = _c.prisma;
            var id = _d.id;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.dmPoll.findFirst({ where: { id: id } })];
                    case 1:
                        poll = _e.sent();
                        if (!(poll === null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono głosowania o podanym ID")];
                    case 2: return [2 /*return*/, _e.sent()];
                    case 3:
                        if (!(poll.startedAt && !poll.finishedAt)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie można usunąć rozpoczętego głosowania")];
                    case 4: return [2 /*return*/, _e.sent()];
                    case 5: return [4 /*yield*/, prisma.dmPoll.update({
                            where: { id: id },
                            data: { deletedAt: itx.createdAt },
                        })];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, itx.reply("Usuni\u0119to g\u0142osowanie ".concat((0, discord_js_1.italic)(poll.title), " [").concat(poll.id, "]"))];
                    case 7:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addGroup("wykluczenia", function (group) {
        return group
            .setDescription("Wykluczenia z głosowań w wiadomościach prywatnych")
            .addCommand("lista", function (command) {
            return command
                .setDescription("Wyświetl listę wykluczeń")
                .handle(function (_a, _params_1, itx_1) { return __awaiter(void 0, [_a, _params_1, itx_1], void 0, function (_b, _params, itx) {
                var paginator, formatExclusion, view;
                var prisma = _b.prisma;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _c.sent();
                            paginator = new db_1.DatabasePaginator(function (props, createdAt) {
                                return prisma.dmPollExclusion.findMany(__assign(__assign({}, props), { orderBy: { createdAt: createdAt } }));
                            }, function () { return prisma.dmPollExclusion.count(); }, { pageSize: 20, defaultOrder: paginate_1.PaginatorOrder.DESC });
                            formatExclusion = function (exclusion, _idx) {
                                return "- ".concat((0, discord_js_1.userMention)(exclusion.userId), " ").concat((0, discord_js_1.time)(exclusion.createdAt, discord_js_1.TimestampStyles.ShortDateTime));
                            };
                            view = new core_1.PaginatedView(paginator, "Wykluczenia z głosowań DM", formatExclusion, true);
                            return [4 /*yield*/, view.render(itx)];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("dodaj", function (command) {
            return command
                .setDescription("Dodaj użytkowników do wykluczeń")
                .addString("users", function (user) {
                return user.setDescription("Użytkownicy (oddzielone spacjami)");
            })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var users, _i, _e, user;
                var prisma = _c.prisma;
                var rawUsers = _d.users;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _f.sent();
                            return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(rawUsers))];
                        case 2:
                            users = _f.sent();
                            return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, users.map(function (u) { return u.id; }))];
                        case 3:
                            _f.sent();
                            _i = 0, _e = users.values();
                            _f.label = 4;
                        case 4:
                            if (!(_i < _e.length)) return [3 /*break*/, 7];
                            user = _e[_i];
                            return [4 /*yield*/, prisma.dmPollExclusion.upsert({
                                    where: { userId: user.id },
                                    create: { userId: user.id, optedOutDuringPollId: null },
                                    update: {},
                                })];
                        case 5:
                            _f.sent();
                            _f.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 4];
                        case 7: return [4 /*yield*/, itx.editReply("Dodano ".concat(users.size, " ").concat(pluralize_1.pluralizers.users(users.size), " do wyklucze\u0144 z g\u0142osowa\u0144 DM"))];
                        case 8:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("usun", function (command) {
            return command
                .setDescription("Usuń użytkowników z wykluczeń")
                .addString("users", function (user) {
                return user.setDescription("Użytkownicy (oddzielone spacjami)");
            })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var users, _i, _e, user;
                var prisma = _c.prisma;
                var rawUsers = _d.users;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _f.sent();
                            return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(rawUsers))];
                        case 2:
                            users = _f.sent();
                            return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, users.map(function (u) { return u.id; }))];
                        case 3:
                            _f.sent();
                            _i = 0, _e = users.values();
                            _f.label = 4;
                        case 4:
                            if (!(_i < _e.length)) return [3 /*break*/, 7];
                            user = _e[_i];
                            return [4 /*yield*/, prisma.dmPollExclusion.delete({ where: { userId: user.id } })];
                        case 5:
                            _f.sent();
                            _f.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 4];
                        case 7: return [4 /*yield*/, itx.editReply("Usuni\u0119to ".concat(users.size, " ").concat(pluralize_1.pluralizers.users(users.size), " z wyklucze\u0144 z g\u0142osowa\u0144 DM"))];
                        case 8:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        })
            .addCommand("sprawdz", function (command) {
            return command
                .setDescription("Sprawdź czy użytkownik jest wykluczony")
                .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
                .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
                var exclusion, lines;
                var prisma = _c.prisma;
                var user = _d.user;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (!itx.inCachedGuild())
                                return [2 /*return*/];
                            return [4 /*yield*/, itx.deferReply()];
                        case 1:
                            _e.sent();
                            return [4 /*yield*/, prisma.dmPollExclusion.findFirst({
                                    where: { userId: user.id },
                                    include: { optedOutDuringPoll: true },
                                })];
                        case 2:
                            exclusion = _e.sent();
                            if (!exclusion) return [3 /*break*/, 4];
                            lines = [
                                "".concat((0, discord_js_1.userMention)(user.id), " jest wykluczony z g\u0142osowa\u0144 DM"),
                                "Data wykluczenia: ".concat((0, discord_js_1.time)(exclusion.createdAt, discord_js_1.TimestampStyles.LongDateTime)),
                            ];
                            if (exclusion.optedOutDuringPoll) {
                                lines.push("Wykluczono podczas g\u0142osowania: ".concat((0, discord_js_1.italic)(exclusion.optedOutDuringPoll.title), " [").concat(exclusion.optedOutDuringPoll.id, "]"));
                            }
                            return [4 /*yield*/, itx.editReply(lines.join("\n"))];
                        case 3:
                            _e.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, itx.editReply("".concat((0, discord_js_1.userMention)(user.id), " nie jest wykluczony z g\u0142osowa\u0144 DM"))];
                        case 5:
                            _e.sent();
                            _e.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
        });
    });
})
    .handle("ready", function (_a, client_1) { return __awaiter(void 0, [_a, client_1], void 0, function (_b, client) {
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        client.on("interactionCreate", function (itx) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, _, rawOptionId, optionId;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!itx.isButton())
                            return [2 /*return*/];
                        // vote-option:optionId
                        if (!itx.customId.startsWith("vote-option:"))
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _b.sent();
                        _a = itx.customId.split(":"), _ = _a[0], rawOptionId = _a[1];
                        if (!!rawOptionId) return [3 /*break*/, 3];
                        console.error("Invalid customId for vote-option button:", itx.customId);
                        return [4 /*yield*/, itx.editReply("Coś poszło nie tak...")];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                    case 3:
                        optionId = Number.parseInt(rawOptionId, 10);
                        return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                                var option, participant, deletedCount, vote;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.dmPollOption.findFirst({
                                                where: { id: optionId },
                                                include: { poll: true },
                                            })];
                                        case 1:
                                            option = _a.sent();
                                            if (!!option) return [3 /*break*/, 3];
                                            console.error("Invalid optionId for vote-option button:", optionId);
                                            return [4 /*yield*/, itx.editReply("Coś poszło nie tak...")];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 3:
                                            if (!option.poll.finishedAt) return [3 /*break*/, 5];
                                            return [4 /*yield*/, itx.editReply("Głosowanie zostało zakończone.")];
                                        case 4:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 5: return [4 /*yield*/, tx.dmPollParticipant.findFirst({
                                                where: {
                                                    userId: itx.user.id,
                                                    poll: { options: { some: { id: optionId } } },
                                                },
                                            })];
                                        case 6:
                                            participant = _a.sent();
                                            if (!!participant) return [3 /*break*/, 8];
                                            return [4 /*yield*/, itx.editReply("Nie możesz wziąć udziału w tym głosowaniu")];
                                        case 7:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 8: return [4 /*yield*/, tx.dmPollVote.deleteMany({
                                                where: { userId: itx.user.id, option: { pollId: option.pollId } },
                                            })];
                                        case 9:
                                            deletedCount = (_a.sent()).count;
                                            return [4 /*yield*/, tx.dmPollVote.create({
                                                    data: { userId: itx.user.id, optionId: optionId },
                                                    include: { option: true },
                                                })];
                                        case 10:
                                            vote = _a.sent();
                                            if (!option.isOptOut) return [3 /*break*/, 16];
                                            return [4 /*yield*/, tx.dmPollExclusion.upsert({
                                                    where: { userId: itx.user.id },
                                                    create: {
                                                        createdAt: itx.createdAt,
                                                        userId: itx.user.id,
                                                        optedOutDuringPollId: option.pollId,
                                                    },
                                                    update: {},
                                                })];
                                        case 11:
                                            _a.sent();
                                            if (!(deletedCount > 0)) return [3 /*break*/, 13];
                                            return [4 /*yield*/, itx.editReply("Usunięto głos i wypisano z przyszłych głosowań")];
                                        case 12:
                                            _a.sent();
                                            return [3 /*break*/, 15];
                                        case 13: return [4 /*yield*/, itx.editReply("Wypisano z przyszłych głosowań")];
                                        case 14:
                                            _a.sent();
                                            _a.label = 15;
                                        case 15: return [2 /*return*/];
                                        case 16:
                                            if (!(deletedCount > 0)) return [3 /*break*/, 18];
                                            return [4 /*yield*/, itx.editReply("Zmieniono g\u0142os na ".concat((0, discord_js_1.bold)(vote.option.option)))];
                                        case 17:
                                            _a.sent();
                                            return [3 /*break*/, 20];
                                        case 18: return [4 /*yield*/, itx.editReply("Oddano g\u0142os na ".concat((0, discord_js_1.bold)(vote.option.option)))];
                                        case 19:
                                            _a.sent();
                                            _a.label = 20;
                                        case 20: return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 4:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); });
