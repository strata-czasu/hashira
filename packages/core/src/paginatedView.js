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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _PaginatedView_paginator, _PaginatedView_message, _PaginatedView_items, _PaginatedView_title, _PaginatedView_orderingEnabled, _PaginatedView_footerExtra, _PaginatedView_renderItem;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedView = void 0;
var discord_js_1 = require("discord.js");
var createAuthorFilter = function (interaction) { return function (action) {
    return action.user.id === interaction.user.id;
}; };
var PaginatedView = /** @class */ (function () {
    function PaginatedView(paginate, title, renderItem, orderingEnabled, footerExtra) {
        if (orderingEnabled === void 0) { orderingEnabled = false; }
        if (footerExtra === void 0) { footerExtra = null; }
        _PaginatedView_paginator.set(this, void 0);
        _PaginatedView_message.set(this, void 0);
        _PaginatedView_items.set(this, []);
        _PaginatedView_title.set(this, undefined);
        _PaginatedView_orderingEnabled.set(this, void 0);
        _PaginatedView_footerExtra.set(this, void 0);
        _PaginatedView_renderItem.set(this, void 0);
        __classPrivateFieldSet(this, _PaginatedView_paginator, paginate, "f");
        __classPrivateFieldSet(this, _PaginatedView_title, title, "f");
        __classPrivateFieldSet(this, _PaginatedView_renderItem, renderItem, "f");
        __classPrivateFieldSet(this, _PaginatedView_orderingEnabled, orderingEnabled, "f");
        __classPrivateFieldSet(this, _PaginatedView_footerExtra, footerExtra, "f");
    }
    PaginatedView.prototype.send = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var content, _a, resource;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        content = "Ładowanie...";
                        if (!(interaction.deferred && !__classPrivateFieldGet(this, _PaginatedView_message, "f"))) return [3 /*break*/, 2];
                        _a = [this, _PaginatedView_message];
                        return [4 /*yield*/, interaction.editReply({ content: content })];
                    case 1:
                        __classPrivateFieldSet.apply(void 0, _a.concat([_b.sent(), "f"]));
                        return [3 /*break*/, 4];
                    case 2:
                        if (!!__classPrivateFieldGet(this, _PaginatedView_message, "f")) return [3 /*break*/, 4];
                        return [4 /*yield*/, interaction.reply({ content: content, withResponse: true })];
                    case 3:
                        resource = (_b.sent()).resource;
                        if (!(resource === null || resource === void 0 ? void 0 : resource.message)) {
                            throw new Error("Message resource not fetched after initial PaginatedView reply");
                        }
                        __classPrivateFieldSet(this, _PaginatedView_message, resource.message, "f");
                        _b.label = 4;
                    case 4: return [4 /*yield*/, this.render(interaction)];
                    case 5:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PaginatedView.prototype.render = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, defaultButtons, orderingButtons, actionRow, renderedItems, buttonAction, _b, error_1;
            var _this = this;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!!__classPrivateFieldGet(this, _PaginatedView_message, "f")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.send(interaction)];
                    case 1: return [2 /*return*/, _d.sent()];
                    case 2:
                        _a = [this, _PaginatedView_items];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _PaginatedView_paginator, "f").current()];
                    case 3:
                        __classPrivateFieldSet.apply(void 0, _a.concat([_d.sent(), "f"]));
                        defaultButtons = [
                            new discord_js_1.ButtonBuilder()
                                .setEmoji("⬅️")
                                .setCustomId("previous")
                                .setDisabled(!__classPrivateFieldGet(this, _PaginatedView_paginator, "f").canPrevious)
                                .setStyle(discord_js_1.ButtonStyle.Primary),
                            new discord_js_1.ButtonBuilder()
                                .setEmoji("➡️")
                                .setCustomId("next")
                                .setDisabled(!__classPrivateFieldGet(this, _PaginatedView_paginator, "f").canNext)
                                .setStyle(discord_js_1.ButtonStyle.Primary),
                        ];
                        orderingButtons = __classPrivateFieldGet(this, _PaginatedView_orderingEnabled, "f")
                            ? [
                                new discord_js_1.ButtonBuilder()
                                    .setLabel("Order by")
                                    .setCustomId("reorder")
                                    .setStyle(discord_js_1.ButtonStyle.Secondary),
                            ]
                            : [];
                        actionRow = new discord_js_1.ActionRowBuilder().addComponents(__spreadArray(__spreadArray([], defaultButtons, true), orderingButtons, true));
                        return [4 /*yield*/, Promise.all(__classPrivateFieldGet(this, _PaginatedView_items, "f").map(function (item, index) {
                                return __classPrivateFieldGet(_this, _PaginatedView_renderItem, "f").call(_this, item, index + __classPrivateFieldGet(_this, _PaginatedView_paginator, "f").currentOffset + 1);
                            }))];
                    case 4:
                        renderedItems = _d.sent();
                        return [4 /*yield*/, __classPrivateFieldGet(this, _PaginatedView_message, "f").edit({
                                content: "",
                                embeds: [
                                    {
                                        title: (_c = __classPrivateFieldGet(this, _PaginatedView_title, "f")) !== null && _c !== void 0 ? _c : "Lista",
                                        description: renderedItems.join("\n"),
                                        footer: { text: this.getFooter() },
                                    },
                                ],
                                components: [actionRow],
                            })];
                    case 5:
                        _d.sent();
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 10, , 12]);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _PaginatedView_message, "f").awaitMessageComponent({
                                componentType: discord_js_1.ComponentType.Button,
                                filter: createAuthorFilter(interaction),
                                time: 60000,
                            })];
                    case 7:
                        buttonAction = _d.sent();
                        _b = [this, _PaginatedView_items];
                        return [4 /*yield*/, this.getNewItems(buttonAction.customId)];
                    case 8:
                        __classPrivateFieldSet.apply(void 0, _b.concat([_d.sent(), "f"]));
                        buttonAction.deferUpdate();
                        return [4 /*yield*/, this.render(interaction)];
                    case 9:
                        _d.sent();
                        return [3 /*break*/, 12];
                    case 10:
                        error_1 = _d.sent();
                        // Handle timeout
                        // TODO)) More specific error handling
                        return [4 /*yield*/, this.finalize()];
                    case 11:
                        // Handle timeout
                        // TODO)) More specific error handling
                        _d.sent();
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    PaginatedView.prototype.finalize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, ((_a = __classPrivateFieldGet(this, _PaginatedView_message, "f")) === null || _a === void 0 ? void 0 : _a.edit({ components: [] }))];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _b.sent();
                        console.error("Error finalizing PaginatedView ".concat(__classPrivateFieldGet(this, _PaginatedView_title, "f"), ":"), e_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PaginatedView.prototype.getNewItems = function (buttonType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(buttonType === "previous")) return [3 /*break*/, 2];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _PaginatedView_paginator, "f").previous()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        if (!(buttonType === "next")) return [3 /*break*/, 4];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _PaginatedView_paginator, "f").next()];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        if (!(buttonType === "reorder")) return [3 /*break*/, 6];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _PaginatedView_paginator, "f").reorder()];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6: throw new Error("Unknown button type: ".concat(buttonType));
                }
            });
        });
    };
    PaginatedView.prototype.getFooter = function () {
        var displayPages = __classPrivateFieldGet(this, _PaginatedView_paginator, "f").displayPages;
        var displayCurrentPage = __classPrivateFieldGet(this, _PaginatedView_paginator, "f").displayCurrentPage;
        var footer = "Strona ".concat(displayCurrentPage, "/").concat(displayPages);
        if (__classPrivateFieldGet(this, _PaginatedView_paginator, "f").count) {
            footer += " (".concat(__classPrivateFieldGet(this, _PaginatedView_paginator, "f").count, ")");
        }
        if (__classPrivateFieldGet(this, _PaginatedView_footerExtra, "f")) {
            footer += " | ".concat(__classPrivateFieldGet(this, _PaginatedView_footerExtra, "f"));
        }
        return footer;
    };
    return PaginatedView;
}());
exports.PaginatedView = PaginatedView;
_PaginatedView_paginator = new WeakMap(), _PaginatedView_message = new WeakMap(), _PaginatedView_items = new WeakMap(), _PaginatedView_title = new WeakMap(), _PaginatedView_orderingEnabled = new WeakMap(), _PaginatedView_footerExtra = new WeakMap(), _PaginatedView_renderItem = new WeakMap();
