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
exports.massDM = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("./base");
var discordTry_1 = require("./util/discordTry");
var errorFollowUp_1 = require("./util/errorFollowUp");
var pluralize_1 = require("./util/pluralize");
var safeSendCode_1 = require("./util/safeSendCode");
exports.massDM = new core_1.Hashira({ name: "massDM" })
    .use(base_1.base)
    .group("massdm", function (group) {
    return group
        .setDescription("Masowe wysyłanie wiadomości prywatnych")
        .setDMPermission(false)
        .setDefaultMemberPermissions(0)
        .addCommand("wyslij", function (command) {
        return command
            .setDescription("Wyślij masową wiadomość do użytkowników z rolą")
            .addRole("rola", function (role) {
            return role.setDescription("Rola, której użytkownicy otrzymają wiadomość");
        })
            .addString("tresc", function (content) {
            return content.setDescription("Treść wiadomości").setRequired(true);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var eligibleMembers, confirmation, start, messageSendStatuses, _e, successfulMessages, failedMessages, lines, dmChannel, failedMessagesReport;
            var strataCzasuLog = _c.strataCzasuLog;
            var role = _d.rola, content = _d.tresc;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _f.sent();
                        return [4 /*yield*/, itx.guild.members.fetch()];
                    case 2:
                        _f.sent();
                        eligibleMembers = role.members;
                        if (!(eligibleMembers.size === 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono użytkowników z podaną rolą.")];
                    case 3:
                        _f.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, (0, core_1.waitForConfirmation)({ send: itx.editReply.bind(itx) }, "Czy na pewno chcesz wys\u0142a\u0107 wiadomo\u015B\u0107 do ".concat((0, discord_js_1.bold)(eligibleMembers.size.toString()), " ").concat(pluralize_1.pluralizers.users(eligibleMembers.size), "?\n\nTre\u015B\u0107: ").concat((0, discord_js_1.italic)(content)), "Tak", "Nie", function (action) { return action.user.id === itx.user.id; })];
                    case 5:
                        confirmation = _f.sent();
                        if (!!confirmation) return [3 /*break*/, 7];
                        return [4 /*yield*/, itx.editReply({
                                content: "Anulowano wysyłanie masowej wiadomości.",
                                components: [],
                            })];
                    case 6:
                        _f.sent();
                        return [2 /*return*/];
                    case 7:
                        start = new Date();
                        strataCzasuLog.push("massdmStart", itx.guild, {
                            user: itx.user,
                            role: role,
                            content: content,
                            createdAt: new Date(),
                        });
                        return [4 /*yield*/, itx.editReply({
                                content: "Rozpoczynam wysy\u0142anie wiadomo\u015Bci do ".concat((0, discord_js_1.bold)(eligibleMembers.size.toString()), " u\u017Cytkownik\u00F3w. To mo\u017Ce zaj\u0105\u0107 kilka minut..."),
                                components: [],
                            })];
                    case 8:
                        _f.sent();
                        return [4 /*yield*/, Promise.all(eligibleMembers.map(function (member) { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, member.send({ content: content })];
                                                        case 1:
                                                            _a.sent();
                                                            return [2 /*return*/, { member: member, success: true }];
                                                    }
                                                });
                                            }); }, [discord_js_1.RESTJSONErrorCodes.CannotSendMessagesToThisUser], function () { return ({ member: member, success: false }); })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }))];
                    case 9:
                        messageSendStatuses = _f.sent();
                        _e = (0, es_toolkit_1.partition)(messageSendStatuses, function (m) { return m.success; }), successfulMessages = _e[0], failedMessages = _e[1];
                        strataCzasuLog.push("massdmEnd", itx.guild, {
                            user: itx.user,
                            role: role,
                            successfulMessages: successfulMessages.length,
                            failedMessages: failedMessages.length,
                            createdAt: start,
                            endedAt: new Date(),
                        });
                        lines = [
                            "Wys\u0142ano wiadomo\u015Bci do ".concat((0, discord_js_1.bold)(successfulMessages.length.toString()), "/").concat((0, discord_js_1.bold)(messageSendStatuses.length.toString()), " u\u017Cytkownik\u00F3w."),
                        ];
                        if (!(failedMessages.length > 0)) return [3 /*break*/, 13];
                        lines.push("Nie uda\u0142o si\u0119 wys\u0142a\u0107 wiadomo\u015Bci do ".concat((0, discord_js_1.bold)(failedMessages.length.toString()), " u\u017Cytkownik\u00F3w."));
                        return [4 /*yield*/, itx.user.createDM()];
                    case 10:
                        dmChannel = _f.sent();
                        return [4 /*yield*/, dmChannel.send({
                                content: "Nie udało się wysłać wiadomości do następujących użytkowników:",
                            })];
                    case 11:
                        _f.sent();
                        failedMessagesReport = failedMessages
                            .map(function (_a) {
                            var member = _a.member;
                            return "- ".concat(member.user.tag, " (").concat(member.user.id, ")");
                        })
                            .join("\n");
                        return [4 /*yield*/, (0, safeSendCode_1.default)(dmChannel.send.bind(dmChannel), failedMessagesReport, "")];
                    case 12:
                        _f.sent();
                        _f.label = 13;
                    case 13: return [4 /*yield*/, itx.editReply(lines.join("\n"))];
                    case 14:
                        _f.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
