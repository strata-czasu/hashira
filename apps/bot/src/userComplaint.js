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
exports.userComplaint = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var specializedConstants_1 = require("./specializedConstants");
var discordTry_1 = require("./util/discordTry");
var errorFollowUp_1 = require("./util/errorFollowUp");
exports.userComplaint = new core_1.Hashira({ name: "user-complaint" })
    .use(base_1.base)
    .command("donos", function (command) {
    return command
        .setDescription("Ciche zgłoszenie do moderacji")
        .setDMPermission(false)
        .handle(function (_ctx, _, itx) { return __awaiter(void 0, void 0, void 0, function () {
        var actionRows, customId, modal, submitAction, content, target, channel, embed, success;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    actionRows = [
                        new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                            .setCustomId("content")
                            .setLabel("Treść")
                            .setPlaceholder("Opisz swój problem")
                            .setRequired(true)
                            .setMinLength(10)
                            .setMaxLength(2000)
                            .setStyle(discord_js_1.TextInputStyle.Paragraph)),
                        new discord_js_1.ActionRowBuilder().setComponents(new discord_js_1.TextInputBuilder()
                            .setCustomId("target")
                            .setLabel("Kogo lub czego dotyczy zgłoszenie?")
                            .setPlaceholder("np. użytkownik, wiadomość lub inny istotny kontekst")
                            .setRequired(true)
                            .setMinLength(3)
                            .setMaxLength(200)
                            .setStyle(discord_js_1.TextInputStyle.Short)),
                    ];
                    customId = "donos:".concat(itx.user.id);
                    modal = new discord_js_1.ModalBuilder()
                        .setCustomId(customId)
                        .setTitle("Zgłoś problem")
                        .addComponents(actionRows);
                    return [4 /*yield*/, itx.showModal(modal)];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                            return itx.awaitModalSubmit({
                                time: 60000 * 15,
                                filter: function (modal) { return modal.customId === customId; },
                            });
                        }, [discord_js_1.DiscordjsErrorCodes.InteractionCollectorError], function () { return null; })];
                case 2:
                    submitAction = _e.sent();
                    if (!submitAction)
                        return [2 /*return*/];
                    return [4 /*yield*/, submitAction.deferReply({ flags: "Ephemeral" })];
                case 3:
                    _e.sent();
                    content = (_b = (_a = submitAction.components
                        .at(0)) === null || _a === void 0 ? void 0 : _a.components.find(function (c) { return c.customId === "content"; })) === null || _b === void 0 ? void 0 : _b.value;
                    target = (_d = (_c = submitAction.components
                        .at(1)) === null || _c === void 0 ? void 0 : _c.components.find(function (c) { return c.customId === "target"; })) === null || _d === void 0 ? void 0 : _d.value;
                    if (!(!content || !target)) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nie podano wszystkich wymaganych danych!")];
                case 4: return [2 /*return*/, _e.sent()];
                case 5: return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, itx.client.channels.fetch(specializedConstants_1.STRATA_CZASU.COMPLAINT_CHANNEL_ID)];
                    }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel, discord_js_1.RESTJSONErrorCodes.MissingAccess], function () { return null; })];
                case 6:
                    channel = _e.sent();
                    if (!(!channel || !channel.isSendable())) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nie udało się wysłać zgłoszenia! Odezwij się bezpośrednio do kogoś z moderacji.")];
                case 7: return [2 /*return*/, _e.sent()];
                case 8:
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle("Zg\u0142oszenie od ".concat(itx.user.tag))
                        .setDescription(content)
                        .addFields({
                        name: "Kogo lub czego dotyczy zgłoszenie?",
                        value: target,
                    }, {
                        name: "Kanał zgłoszenia",
                        value: "".concat((0, discord_js_1.channelMention)(itx.channelId), " (").concat(itx.channelId, ")"),
                    })
                        .setFooter({
                        text: "ID: ".concat(itx.user.id),
                        iconURL: itx.user.displayAvatarURL(),
                    })
                        .setTimestamp(submitAction.createdAt);
                    return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                channel.send({
                                    content: "@everyone",
                                    embeds: [embed],
                                    allowedMentions: {
                                        parse: ["everyone"],
                                    },
                                });
                                return [2 /*return*/, true];
                            });
                        }); }, [discord_js_1.RESTJSONErrorCodes.MissingAccess], function () { return false; })];
                case 9:
                    success = _e.sent();
                    if (!!success) return [3 /*break*/, 11];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(submitAction, "Nie udało się wysłać zgłoszenia! Odezwij się bezpośrednio do kogoś z moderacji.")];
                case 10: return [2 /*return*/, _e.sent()];
                case 11: return [4 /*yield*/, submitAction.editReply("Zgłoszenie zostało wysłane!")];
                case 12:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
