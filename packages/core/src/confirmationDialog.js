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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ConfirmationDialog_message, _ConfirmationDialog_title, _ConfirmationDialog_acceptMessage, _ConfirmationDialog_declineMessage, _ConfirmationDialog_acceptCallback, _ConfirmationDialog_declineCallback, _ConfirmationDialog_filter, _ConfirmationDialog_timeoutCallback;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationDialog = void 0;
exports.waitForConfirmation = waitForConfirmation;
var discord_js_1 = require("discord.js");
var ConfirmationDialog = /** @class */ (function () {
    function ConfirmationDialog(title, acceptMessage, declineMessage, acceptCallback, declineCallback, filter, timeoutCallback) {
        if (timeoutCallback === void 0) { timeoutCallback = null; }
        _ConfirmationDialog_message.set(this, void 0);
        _ConfirmationDialog_title.set(this, void 0);
        _ConfirmationDialog_acceptMessage.set(this, void 0);
        _ConfirmationDialog_declineMessage.set(this, void 0);
        _ConfirmationDialog_acceptCallback.set(this, void 0);
        _ConfirmationDialog_declineCallback.set(this, void 0);
        _ConfirmationDialog_filter.set(this, void 0);
        _ConfirmationDialog_timeoutCallback.set(this, void 0);
        __classPrivateFieldSet(this, _ConfirmationDialog_title, title, "f");
        __classPrivateFieldSet(this, _ConfirmationDialog_acceptMessage, acceptMessage, "f");
        __classPrivateFieldSet(this, _ConfirmationDialog_declineMessage, declineMessage, "f");
        __classPrivateFieldSet(this, _ConfirmationDialog_acceptCallback, acceptCallback, "f");
        __classPrivateFieldSet(this, _ConfirmationDialog_declineCallback, declineCallback, "f");
        __classPrivateFieldSet(this, _ConfirmationDialog_filter, filter, "f");
        __classPrivateFieldSet(this, _ConfirmationDialog_timeoutCallback, timeoutCallback, "f");
    }
    ConfirmationDialog.prototype.send = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var buttons, actionRow, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        buttons = [
                            new discord_js_1.ButtonBuilder()
                                .setLabel(__classPrivateFieldGet(this, _ConfirmationDialog_acceptMessage, "f"))
                                .setCustomId("accept")
                                .setStyle(discord_js_1.ButtonStyle.Primary),
                            new discord_js_1.ButtonBuilder()
                                .setLabel(__classPrivateFieldGet(this, _ConfirmationDialog_declineMessage, "f"))
                                .setCustomId("decline")
                                .setStyle(discord_js_1.ButtonStyle.Danger),
                        ];
                        actionRow = new discord_js_1.ActionRowBuilder().addComponents(buttons);
                        if (!!__classPrivateFieldGet(this, _ConfirmationDialog_message, "f")) return [3 /*break*/, 2];
                        _a = [this, _ConfirmationDialog_message];
                        return [4 /*yield*/, interaction.send({
                                content: __classPrivateFieldGet(this, _ConfirmationDialog_title, "f"),
                                components: [actionRow],
                            })];
                    case 1:
                        __classPrivateFieldSet.apply(void 0, _a.concat([_b.sent(), "f"]));
                        _b.label = 2;
                    case 2: return [4 /*yield*/, this.render(interaction)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ConfirmationDialog.prototype.render = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var buttonAction, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!__classPrivateFieldGet(this, _ConfirmationDialog_message, "f")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.send(interaction)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        _a.trys.push([2, 5, , 9]);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _ConfirmationDialog_message, "f").awaitMessageComponent({
                                componentType: discord_js_1.ComponentType.Button,
                                filter: __classPrivateFieldGet(this, _ConfirmationDialog_filter, "f"),
                                time: 60000,
                            })];
                    case 3:
                        buttonAction = _a.sent();
                        return [4 /*yield*/, this.runCallback(buttonAction.customId)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 5:
                        error_1 = _a.sent();
                        if (!__classPrivateFieldGet(this, _ConfirmationDialog_timeoutCallback, "f")) return [3 /*break*/, 7];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _ConfirmationDialog_timeoutCallback, "f").call(this)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [4 /*yield*/, __classPrivateFieldGet(this, _ConfirmationDialog_message, "f").edit({ components: [] })];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    ConfirmationDialog.prototype.runCallback = function (customId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(customId === "accept")) return [3 /*break*/, 2];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _ConfirmationDialog_acceptCallback, "f").call(this)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, __classPrivateFieldGet(this, _ConfirmationDialog_declineCallback, "f").call(this)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ConfirmationDialog;
}());
exports.ConfirmationDialog = ConfirmationDialog;
_ConfirmationDialog_message = new WeakMap(), _ConfirmationDialog_title = new WeakMap(), _ConfirmationDialog_acceptMessage = new WeakMap(), _ConfirmationDialog_declineMessage = new WeakMap(), _ConfirmationDialog_acceptCallback = new WeakMap(), _ConfirmationDialog_declineCallback = new WeakMap(), _ConfirmationDialog_filter = new WeakMap(), _ConfirmationDialog_timeoutCallback = new WeakMap();
/**
 * Displays a confirmation dialog to the user and waits for their response.
 *
 * @example
 * // Example usage with Discord.js interaction
 * const confirmation = await waitForConfirmation(
 *   { send: interaction.editReply.bind(interaction) },
 *   "Are you sure you want to send this message?",
 *   "Yes",
 *   "No",
 *   (action) => action.user.id === interaction.user.id
 * );
 *
 * if (confirmation) {
 *   await interaction.editReply("Proceeding with operation...");
 * } else {
 *   await interaction.editReply("Operation cancelled.");
 * }
 */
function waitForConfirmation(interaction, title, acceptMessage, declineMessage, filter) {
    var _this = this;
    return new Promise(function (resolve) {
        var acceptCallback = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                resolve(true);
                return [2 /*return*/];
            });
        }); };
        var declineCallback = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                resolve(false);
                return [2 /*return*/];
            });
        }); };
        var confirmationDialog = new ConfirmationDialog(title, acceptMessage, declineMessage, acceptCallback, declineCallback, filter, declineCallback);
        confirmationDialog.render(interaction);
    });
}
