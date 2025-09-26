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
exports.dmForwarding = void 0;
var core_1 = require("@hashira/core");
var paginate_1 = require("@hashira/core/paginate");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var specializedConstants_1 = require("./specializedConstants");
var discordTry_1 = require("./util/discordTry");
var errorFollowUp_1 = require("./util/errorFollowUp");
var sendDirectMessage_1 = require("./util/sendDirectMessage");
exports.dmForwarding = new core_1.Hashira({ name: "dmForwarding" })
    .use(base_1.base)
    .handle("directMessageCreate", function (_, message) { return __awaiter(void 0, void 0, void 0, function () {
    var channel;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (message.author.bot)
                    return [2 /*return*/];
                if (!message.channel.isDMBased())
                    return [2 /*return*/];
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, message.client.channels.fetch(specializedConstants_1.STRATA_CZASU.DM_FORWARD_CHANNEL_ID)];
                    }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel, discord_js_1.RESTJSONErrorCodes.MissingAccess], function () { return null; })];
            case 1:
                channel = _a.sent();
                if (!channel || !channel.isSendable())
                    return [2 /*return*/];
                return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, channel.send({
                                    content: "".concat((0, discord_js_1.bold)(message.author.tag), ": ").concat(message.content),
                                    embeds: message.embeds,
                                    files: message.attachments.map(function (attachment) { return attachment.url; }),
                                })];
                        });
                    }); }, [discord_js_1.RESTJSONErrorCodes.MissingAccess], function () { return console.warn("Missing access to send message to DM forward channel"); })];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .group("dm", function (group) {
    return group
        .setDescription("Komendy do zarządzania prywatnymi wiadomościami")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("send", function (command) {
        return command
            .setDescription("Wyślij prywatną wiaodmość")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .addString("content", function (content) { return content.setDescription("Treść wiadomości"); })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var logChannel, messageSent;
            var user = _b.user, content = _b.content;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        if (!(user.id === itx.client.user.id)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie mogę wysłać wiadomości do siebie")];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, itx.client.channels.fetch(specializedConstants_1.STRATA_CZASU.DM_FORWARD_CHANNEL_ID)];
                        }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel, discord_js_1.RESTJSONErrorCodes.MissingAccess], function () { return null; })];
                    case 4:
                        logChannel = _c.sent();
                        if (!logChannel)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, content)];
                    case 5:
                        messageSent = _c.sent();
                        if (!messageSent) return [3 /*break*/, 7];
                        return [4 /*yield*/, itx.editReply("Wys\u0142ano wiadomo\u015B\u0107 do ".concat((0, discord_js_1.userMention)(user.id), ": ").concat(content))];
                    case 6:
                        _c.sent();
                        if (logChannel === null || logChannel === void 0 ? void 0 : logChannel.isSendable()) {
                            logChannel.send("".concat((0, discord_js_1.bold)(itx.user.tag), " -> ").concat((0, discord_js_1.bold)(user.tag), ": ").concat(content));
                        }
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, itx.editReply("Nie udało się wysłać wiadomości")];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("history", function (command) {
        return command
            .setDescription("Wyświetl historię wiadomości")
            .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var paginator, formatMessage, paginatedView;
            var user = _b.user;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        if (!(user.id === itx.client.user.id)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie mogę wyświetlić historii wiadomości z samym sobą")];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3: return [4 /*yield*/, user.createDM()];
                    case 4:
                        _c.sent();
                        if (!user.dmChannel) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie mogę wyświetlić historii wiadomości z tym użytkownikiem")];
                        }
                        paginator = new paginate_1.TextChannelPaginator({
                            channel: user.dmChannel,
                            pageSize: 15,
                        });
                        formatMessage = function (message) {
                            return "".concat((0, discord_js_1.time)(message.createdAt, discord_js_1.TimestampStyles.ShortTime), " ").concat((0, discord_js_1.bold)(message.author.username), ": ").concat(message.content);
                        };
                        paginatedView = new core_1.PaginatedView(paginator, "Historia wiadomo\u015Bci z ".concat(user.tag), formatMessage, false, "ID: ".concat(user.id));
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 5:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
