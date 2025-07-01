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
exports.birthday2024 = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var INSTRUCTION_CHANNEL_ID = "1268218097605541898";
var NON_PARTICIPANT_MESSAGE = [
    (0, discord_js_1.heading)("Hej, teraz jestem bardzo, ale to bardzo zajęty. Rozwiązuję tajemnice tego serwera...", discord_js_1.HeadingLevel.Three),
    "Je\u017Celi chcesz mnie wesprze\u0107. Sprawd\u017A info tutaj: ".concat((0, discord_js_1.channelMention)(INSTRUCTION_CHANNEL_ID)),
    "Jeżeli już mi pomagasz, to pewnie nie to czego szukamy. Pomyśl! To musi być gdzieś blisko!",
].join("\n");
var replacers = {
    "\\n": function () { return "\n"; },
    "{{user}}": function (_a) {
        var userId = _a.userId;
        return "<@".concat(userId, ">");
    },
};
var runReplacers = function (content, ctx) {
    var result = content;
    for (var _i = 0, _a = Object.entries(replacers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], replacer = _b[1];
        result = result.replaceAll(key, replacer(ctx));
    }
    return result;
};
var readComponents = function (stage) {
    if (stage.buttons.length === 0)
        return [];
    var actionRow = new discord_js_1.ActionRowBuilder();
    // Split buttons into label and customId
    var buttons = stage.buttons.map(function (button) { return button.split(":"); });
    for (var _i = 0, buttons_1 = buttons; _i < buttons_1.length; _i++) {
        var _a = buttons_1[_i], label = _a[0], customId = _a[1];
        if (!label || !customId) {
            throw new Error("Invalid button format");
        }
        var randomEnding = (0, es_toolkit_1.randomInt)(1000, 9999);
        actionRow.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId("".concat(customId, "_").concat(randomEnding))
            .setLabel(label)
            .setStyle(discord_js_1.ButtonStyle.Primary));
    }
    return [actionRow];
};
var completeStage = function (prisma, stage, authorId, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var content, components;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                content = runReplacers(stage.outputRequirementsValid, { userId: authorId });
                components = readComponents(stage);
                return [4 /*yield*/, reply({ content: content, components: components })];
            case 1:
                _a.sent();
                return [4 /*yield*/, prisma.birthdayEventStage2024Completion.create({
                        data: { userId: authorId, stageId: stage.id },
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var handleStageInput = function (prisma, authorId, content, reply) { return __awaiter(void 0, void 0, void 0, function () {
    var lastFinishedStages, mentionedStage, lastStagesIds, isLocked, content_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.birthdayEventStage2024Completion.findMany({
                    where: { userId: authorId },
                    orderBy: { timestamp: "desc" },
                })];
            case 1:
                lastFinishedStages = _a.sent();
                return [4 /*yield*/, prisma.birthdayEventStage2024.findFirst({
                        where: { keyword: content.toLowerCase() },
                    })];
            case 2:
                mentionedStage = _a.sent();
                if (!!mentionedStage) return [3 /*break*/, 4];
                return [4 /*yield*/, reply({ content: NON_PARTICIPANT_MESSAGE })];
            case 3: return [2 /*return*/, _a.sent()];
            case 4:
                lastStagesIds = lastFinishedStages.map(function (stage) { return stage.stageId; });
                if (!lastStagesIds.includes(mentionedStage.id)) return [3 /*break*/, 6];
                return [4 /*yield*/, reply({ content: "Już rozwiązałxś ten etap!" })];
            case 5: return [2 /*return*/, _a.sent()];
            case 6:
                isLocked = (0, es_toolkit_1.intersection)(mentionedStage.lockedBy, lastStagesIds).length > 0;
                if (!isLocked) return [3 /*break*/, 8];
                return [4 /*yield*/, reply({ content: "Ten etap jest zablokowany przez twój inny wybór" })];
            case 7: return [2 /*return*/, _a.sent()];
            case 8:
                if (!(mentionedStage.requiredStageId &&
                    !lastStagesIds.includes(mentionedStage.requiredStageId))) return [3 /*break*/, 11];
                if (!mentionedStage.outputRequirementsInvalid) return [3 /*break*/, 10];
                content_1 = runReplacers(mentionedStage.outputRequirementsInvalid, {
                    userId: authorId,
                });
                return [4 /*yield*/, reply({ content: content_1 })];
            case 9:
                _a.sent();
                _a.label = 10;
            case 10: return [2 /*return*/];
            case 11: return [4 /*yield*/, completeStage(prisma, mentionedStage, authorId, reply)];
            case 12:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.birthday2024 = new core_1.Hashira({ name: "birthday-2024" })
    .use(base_1.base)
    .group("birthday-2024", function (group) {
    return group
        .setDescription("Komendy związane z urodzinami 2024")
        .setDefaultMemberPermissions(0)
        .addCommand("add-stage", function (command) {
        return command
            .setDescription("Dodaje etap urodzin 2024")
            .addString("keyword", function (option) { return option.setDescription("Słowo kluczowe"); })
            .addString("output-requirements-valid", function (option) {
            return option.setDescription("Wymagania dla poprawnego rozwiązania");
        })
            .addString("output-requirements-invalid", function (option) {
            return option
                .setRequired(false)
                .setDescription("Wymagania dla niepoprawnego rozwiązania");
        })
            .addInteger("required-stage-id", function (option) {
            return option.setRequired(false).setDescription("ID wymaganego etapu");
        })
            .addString("buttons", function (option) {
            return option
                .setRequired(false)
                .setDescription("Przyciski w formacie LABEL:ID, oddzielone `|`");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var stage;
            var prisma = _c.prisma;
            var keyword = _d.keyword, outputRequirementsValid = _d["output-requirements-valid"], outputRequirementsInvalid = _d["output-requirements-invalid"], requiredStageId = _d["required-stage-id"], buttons = _d.buttons;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, prisma.birthdayEventStage2024.create({
                            data: {
                                keyword: keyword,
                                outputRequirementsValid: outputRequirementsValid,
                                outputRequirementsInvalid: outputRequirementsInvalid,
                                requiredStageId: requiredStageId,
                                buttons: buttons ? buttons.split("|") : [],
                            },
                        })];
                    case 1:
                        stage = _e.sent();
                        return [4 /*yield*/, itx.reply("Dodano etap ".concat((0, discord_js_1.inlineCode)(stage.id.toString())))];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("list-stages", function (command) {
        return command
            .setDescription("Lista etapów urodzin 2024")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var paginator, extractButtons, formatStage, paginate;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        paginator = new db_1.DatabasePaginator(function (props, id) {
                            return prisma.birthdayEventStage2024.findMany(__assign(__assign({}, props), { orderBy: { id: id } }));
                        }, function () { return prisma.birthdayEventStage2024.count(); }, { pageSize: 5 });
                        extractButtons = function (row) {
                            return row.buttons.map(function (button) { return button.split(":")[1]; });
                        };
                        formatStage = function (row) {
                            var _a, _b;
                            return [
                                (0, discord_js_1.heading)("".concat(row.keyword, " (").concat(row.id, ")"), discord_js_1.HeadingLevel.Three),
                                "Wiadomo\u015B\u0107 udanej pr\u00F3by: ".concat(row.outputRequirementsValid),
                                "Wiadomo\u015B\u0107 nieudanej pr\u00F3by: ".concat((_a = row.outputRequirementsInvalid) !== null && _a !== void 0 ? _a : "Brak"),
                                "Wymagany etap: ".concat((_b = row.requiredStageId) !== null && _b !== void 0 ? _b : "Brak"),
                                "Przyciski: ".concat(row.buttons.length > 0 ? extractButtons(row) : "Brak"),
                                "Zablokowane przez: ".concat(row.lockedBy.length > 0 ? row.lockedBy.join(", ") : "Brak"),
                            ].join("\n");
                        };
                        paginate = new core_1.PaginatedView(paginator, "Etapy urodzin 2024", formatStage, true);
                        return [4 /*yield*/, paginate.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edit-stage", function (command) {
        return command
            .setDescription("Edytuje etap urodzin 2024")
            .addInteger("id", function (option) { return option.setDescription("ID etapu"); })
            .addString("keyword", function (option) {
            return option.setRequired(false).setDescription("Słowo kluczowe");
        })
            .addString("output-requirements-valid", function (option) {
            return option
                .setRequired(false)
                .setDescription("Wymagania dla poprawnego rozwiązania");
        })
            .addString("output-requirements-invalid", function (option) {
            return option
                .setRequired(false)
                .setDescription("Wymagania dla niepoprawnego rozwiązania");
        })
            .addInteger("required-stage-id", function (option) {
            return option.setRequired(false).setDescription("ID wymaganego etapu");
        })
            .addString("buttons", function (option) {
            return option
                .setRequired(false)
                .setDescription("Przyciski w formacie LABEL:ID, oddzielone `|`");
        })
            .addString("locked-by", function (option) {
            return option
                .setRequired(false)
                .setDescription("ID etapów, które blokują ten etap (oddzielone `|`)");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var updateData, stage;
            var prisma = _c.prisma;
            var id = _d.id, keyword = _d.keyword, outputRequirementsValid = _d["output-requirements-valid"], outputRequirementsInvalid = _d["output-requirements-invalid"], requiredStageId = _d["required-stage-id"], buttons = _d.buttons, lockedBy = _d["locked-by"];
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        updateData = __assign(__assign(__assign(__assign(__assign(__assign({}, (keyword ? { keyword: keyword } : {})), (outputRequirementsValid ? { outputRequirementsValid: outputRequirementsValid } : {})), (outputRequirementsInvalid ? { outputRequirementsInvalid: outputRequirementsInvalid } : {})), (requiredStageId ? { requiredStageId: requiredStageId } : {})), (buttons ? { buttons: buttons.split("|") } : {})), (lockedBy
                            ? {
                                lockedBy: lockedBy
                                    .split("|")
                                    .map(function (it) { return Number.parseInt(it, 10); }),
                            }
                            : {}));
                        if (!(Object.keys(updateData).length === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, itx.reply("Nie podano żadnych danych do edycji")];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, prisma.birthdayEventStage2024.update({
                            where: { id: id },
                            data: updateData,
                        })];
                    case 3:
                        stage = _e.sent();
                        return [4 /*yield*/, itx.reply("Edytowano etap ".concat((0, discord_js_1.inlineCode)(stage.id.toString())))];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("mermaid-graph", function (command) {
        return command
            .setDescription("Generuje graf etapów urodzin 2024 w formacie Mermaid")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var stages, nodes, edges, graph;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.birthdayEventStage2024.findMany()];
                    case 1:
                        stages = _c.sent();
                        nodes = stages.map(function (stage) {
                            return "  ".concat(stage.id, "[\"").concat(stage.keyword, "\"]");
                        });
                        edges = stages
                            .filter(function (stage) { return stage.requiredStageId; })
                            .map(function (stage) {
                            return "  ".concat(stage.requiredStageId, " --> ").concat(stage.id);
                        });
                        graph = __spreadArray(__spreadArray(["graph TD"], nodes, true), edges, true).join("\n");
                        return [4 /*yield*/, itx.reply((0, discord_js_1.codeBlock)("mermaid", graph))];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("notify-participants", function (command) {
        return command
            .setDescription("Powiadamia uczestników o urodzinach 2024")
            .addString("message", function (option) {
            return option.setDescription("Wiadomość do wysłania");
        })
            .addInteger("stage-id", function (option) {
            return option
                .setRequired(false)
                .setDescription("ID etapu, który uczestnicy ukończyli");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var where, participants, sendDmPromises, results, failed;
            var prisma = _c.prisma;
            var message = _d.message, stageId = _d["stage-id"];
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        where = __assign({}, (stageId ? { stageId: stageId } : {}));
                        return [4 /*yield*/, prisma.birthdayEventStage2024Completion.findMany({ where: where, distinct: "userId" })];
                    case 2:
                        participants = _e.sent();
                        sendDmPromises = participants.map(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                            var content, user;
                            var userId = _b.userId;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        content = runReplacers(message, { userId: userId });
                                        return [4 /*yield*/, itx.client.users.fetch(userId)];
                                    case 1:
                                        user = _c.sent();
                                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, content)];
                                    case 2: return [2 /*return*/, [_c.sent(), user.id]];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(sendDmPromises)];
                    case 3:
                        results = _e.sent();
                        failed = results.filter(function (_a) {
                            var success = _a[0];
                            return !success;
                        });
                        if (!(failed.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, itx.editReply("Wys\u0142ano powiadomienia do ".concat(participants.length, " uczestnik\u00F3w, ale nie uda\u0142o si\u0119 wys\u0142a\u0107 do: ").concat(failed
                                .map(function (_a) {
                                var userId = _a[1];
                                return (0, discord_js_1.userMention)(userId);
                            })
                                .join(", ")))];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                    case 5: return [4 /*yield*/, itx.editReply("Wys\u0142ano powiadomienia do ".concat(participants.length, " uczestnik\u00F3w"))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("messageCreate", function (_a, message_1) { return __awaiter(void 0, [_a, message_1], void 0, function (_b, message) {
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (message.author.bot)
                    return [2 /*return*/];
                if (message.inGuild())
                    return [2 /*return*/];
                return [4 /*yield*/, handleStageInput(prisma, message.author.id, message.content, function (options) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, message.reply(options)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); })
    .handle("ready", function (_a, client_1) { return __awaiter(void 0, [_a, client_1], void 0, function (_b, client) {
    var prisma = _b.prisma;
    return __generator(this, function (_c) {
        client.on("interactionCreate", function (interaction) { return __awaiter(void 0, void 0, void 0, function () {
            var customId, matchingStage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!interaction.isButton())
                            return [2 /*return*/];
                        customId = interaction.customId.split("_")[0];
                        if (!customId)
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.birthdayEventStage2024.findFirst({
                                where: { keyword: customId },
                            })];
                    case 1:
                        matchingStage = _a.sent();
                        if (!matchingStage)
                            return [2 /*return*/];
                        return [4 /*yield*/, handleStageInput(prisma, interaction.user.id, matchingStage.keyword, function (options) { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, interaction.reply(options)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); });
