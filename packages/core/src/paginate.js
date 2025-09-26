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
var _TextChannelPaginator_channel, _TextChannelPaginator_pageSize, _TextChannelPaginator_page, _TextChannelPaginator_items, _TextChannelPaginator_lastPage;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextChannelPaginator = void 0;
var TextChannelPaginator = /** @class */ (function () {
    function TextChannelPaginator(_a) {
        var channel = _a.channel, pageSize = _a.pageSize;
        _TextChannelPaginator_channel.set(this, void 0);
        _TextChannelPaginator_pageSize.set(this, void 0);
        _TextChannelPaginator_page.set(this, 0);
        _TextChannelPaginator_items.set(this, []);
        _TextChannelPaginator_lastPage.set(this, null);
        __classPrivateFieldSet(this, _TextChannelPaginator_channel, channel, "f");
        __classPrivateFieldSet(this, _TextChannelPaginator_pageSize, pageSize, "f");
    }
    Object.defineProperty(TextChannelPaginator.prototype, "count", {
        get: function () {
            if (!__classPrivateFieldGet(this, _TextChannelPaginator_lastPage, "f"))
                return null;
            return __classPrivateFieldGet(this, _TextChannelPaginator_items, "f").length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TextChannelPaginator.prototype, "currentOffset", {
        get: function () {
            return __classPrivateFieldGet(this, _TextChannelPaginator_page, "f") * __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TextChannelPaginator.prototype, "displayPages", {
        get: function () {
            if (__classPrivateFieldGet(this, _TextChannelPaginator_lastPage, "f") === null)
                return "?";
            return (__classPrivateFieldGet(this, _TextChannelPaginator_lastPage, "f") + 1).toString();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TextChannelPaginator.prototype, "displayCurrentPage", {
        get: function () {
            return (__classPrivateFieldGet(this, _TextChannelPaginator_page, "f") + 1).toString();
        },
        enumerable: false,
        configurable: true
    });
    TextChannelPaginator.prototype.current = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPage()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    TextChannelPaginator.prototype.getPage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var end, messages;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        end = this.currentOffset + __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f");
                        if (!(__classPrivateFieldGet(this, _TextChannelPaginator_lastPage, "f") === null && __classPrivateFieldGet(this, _TextChannelPaginator_items, "f").length < end)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.fetchMessages()];
                    case 1:
                        messages = _b.sent();
                        (_a = __classPrivateFieldGet(this, _TextChannelPaginator_items, "f")).push.apply(_a, Array.from(messages.values()));
                        // If we got less messages than the page size, we are on the last page
                        if (messages.size < __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f")) {
                            __classPrivateFieldSet(this, _TextChannelPaginator_lastPage, __classPrivateFieldGet(this, _TextChannelPaginator_page, "f"), "f");
                        }
                        _b.label = 2;
                    case 2: return [2 /*return*/, __classPrivateFieldGet(this, _TextChannelPaginator_items, "f").slice(this.currentOffset, end)];
                }
            });
        });
    };
    TextChannelPaginator.prototype.fetchMessages = function () {
        return __awaiter(this, void 0, void 0, function () {
            var previousPage, lastMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(__classPrivateFieldGet(this, _TextChannelPaginator_items, "f").length === 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _TextChannelPaginator_channel, "f").messages.fetch({ limit: __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f") })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        previousPage = __classPrivateFieldGet(this, _TextChannelPaginator_items, "f").slice(this.currentOffset - __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f"), this.currentOffset);
                        if (previousPage.length < __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f")) {
                            throw new Error("Previous page was not full, can't fetch more messages");
                        }
                        lastMessage = previousPage.at(-1);
                        if (!lastMessage) {
                            throw new Error("Last message is missing");
                        }
                        return [4 /*yield*/, __classPrivateFieldGet(this, _TextChannelPaginator_channel, "f").messages.fetch({
                                limit: __classPrivateFieldGet(this, _TextChannelPaginator_pageSize, "f"),
                                before: lastMessage.id,
                            })];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    TextChannelPaginator.prototype.reorder = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("Ordering is not supported");
            });
        });
    };
    Object.defineProperty(TextChannelPaginator.prototype, "canPrevious", {
        get: function () {
            return __classPrivateFieldGet(this, _TextChannelPaginator_page, "f") > 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TextChannelPaginator.prototype, "canNext", {
        get: function () {
            if (__classPrivateFieldGet(this, _TextChannelPaginator_lastPage, "f") === null)
                return true;
            return __classPrivateFieldGet(this, _TextChannelPaginator_page, "f") < __classPrivateFieldGet(this, _TextChannelPaginator_lastPage, "f");
        },
        enumerable: false,
        configurable: true
    });
    TextChannelPaginator.prototype.next = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.canNext)
                            return [2 /*return*/, []];
                        __classPrivateFieldSet(this, _TextChannelPaginator_page, (_a = __classPrivateFieldGet(this, _TextChannelPaginator_page, "f"), _a++, _a), "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    TextChannelPaginator.prototype.previous = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.canPrevious)
                            return [2 /*return*/, []];
                        __classPrivateFieldSet(this, _TextChannelPaginator_page, (_a = __classPrivateFieldGet(this, _TextChannelPaginator_page, "f"), _a--, _a), "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    return TextChannelPaginator;
}());
exports.TextChannelPaginator = TextChannelPaginator;
_TextChannelPaginator_channel = new WeakMap(), _TextChannelPaginator_pageSize = new WeakMap(), _TextChannelPaginator_page = new WeakMap(), _TextChannelPaginator_items = new WeakMap(), _TextChannelPaginator_lastPage = new WeakMap();
