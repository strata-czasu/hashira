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
var _StaticPaginator_items, _StaticPaginator_pageSize, _StaticPaginator_page, _StaticPaginator_ordering;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticPaginator = exports.toggleOrder = exports.PaginatorOrder = void 0;
var PaginatorOrder;
(function (PaginatorOrder) {
    PaginatorOrder["ASC"] = "asc";
    PaginatorOrder["DESC"] = "desc";
})(PaginatorOrder || (exports.PaginatorOrder = PaginatorOrder = {}));
var toggleOrder = function (order) {
    return order === PaginatorOrder.ASC ? PaginatorOrder.DESC : PaginatorOrder.ASC;
};
exports.toggleOrder = toggleOrder;
var defaultCompare = function (_a, _b) { return 0; };
var StaticPaginator = /** @class */ (function () {
    function StaticPaginator(_c) {
        var items = _c.items, pageSize = _c.pageSize, compare = _c.compare, ordering = _c.ordering;
        _StaticPaginator_items.set(this, void 0);
        _StaticPaginator_pageSize.set(this, void 0);
        _StaticPaginator_page.set(this, 0);
        _StaticPaginator_ordering.set(this, PaginatorOrder.ASC);
        __classPrivateFieldSet(this, _StaticPaginator_items, __spreadArray([], items, true), "f");
        __classPrivateFieldGet(this, _StaticPaginator_items, "f").sort(compare !== null && compare !== void 0 ? compare : defaultCompare);
        __classPrivateFieldSet(this, _StaticPaginator_pageSize, pageSize, "f");
        __classPrivateFieldSet(this, _StaticPaginator_ordering, ordering !== null && ordering !== void 0 ? ordering : PaginatorOrder.ASC, "f");
        if (__classPrivateFieldGet(this, _StaticPaginator_ordering, "f") === PaginatorOrder.DESC)
            __classPrivateFieldGet(this, _StaticPaginator_items, "f").reverse();
    }
    Object.defineProperty(StaticPaginator.prototype, "count", {
        get: function () {
            return __classPrivateFieldGet(this, _StaticPaginator_items, "f").length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StaticPaginator.prototype, "currentOffset", {
        get: function () {
            return __classPrivateFieldGet(this, _StaticPaginator_page, "f") * __classPrivateFieldGet(this, _StaticPaginator_pageSize, "f");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StaticPaginator.prototype, "displayPages", {
        get: function () {
            return Math.ceil(__classPrivateFieldGet(this, _StaticPaginator_items, "f").length / __classPrivateFieldGet(this, _StaticPaginator_pageSize, "f")).toString();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StaticPaginator.prototype, "displayCurrentPage", {
        get: function () {
            return (__classPrivateFieldGet(this, _StaticPaginator_page, "f") + 1).toString();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StaticPaginator.prototype, "canPrevious", {
        get: function () {
            return __classPrivateFieldGet(this, _StaticPaginator_page, "f") > 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(StaticPaginator.prototype, "canNext", {
        get: function () {
            return (__classPrivateFieldGet(this, _StaticPaginator_page, "f") + 1) * __classPrivateFieldGet(this, _StaticPaginator_pageSize, "f") < __classPrivateFieldGet(this, _StaticPaginator_items, "f").length;
        },
        enumerable: false,
        configurable: true
    });
    StaticPaginator.prototype.current = function () {
        return __awaiter(this, void 0, void 0, function () {
            var end;
            return __generator(this, function (_c) {
                end = this.currentOffset + __classPrivateFieldGet(this, _StaticPaginator_pageSize, "f");
                return [2 /*return*/, __classPrivateFieldGet(this, _StaticPaginator_items, "f").slice(this.currentOffset, end)];
            });
        });
    };
    StaticPaginator.prototype.reorder = function (orderBy) {
        return __awaiter(this, void 0, void 0, function () {
            var nextOrder;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        nextOrder = orderBy !== null && orderBy !== void 0 ? orderBy : (0, exports.toggleOrder)(__classPrivateFieldGet(this, _StaticPaginator_ordering, "f"));
                        if (nextOrder !== __classPrivateFieldGet(this, _StaticPaginator_ordering, "f")) {
                            __classPrivateFieldGet(this, _StaticPaginator_items, "f").reverse();
                        }
                        __classPrivateFieldSet(this, _StaticPaginator_ordering, nextOrder, "f");
                        __classPrivateFieldSet(this, _StaticPaginator_page, 0, "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    StaticPaginator.prototype.next = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.canNext)
                            return [2 /*return*/, []];
                        __classPrivateFieldSet(this, _StaticPaginator_page, (_c = __classPrivateFieldGet(this, _StaticPaginator_page, "f"), _c++, _c), "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    };
    StaticPaginator.prototype.previous = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.canPrevious)
                            return [2 /*return*/, []];
                        __classPrivateFieldSet(this, _StaticPaginator_page, (_c = __classPrivateFieldGet(this, _StaticPaginator_page, "f"), _c--, _c), "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _d.sent()];
                }
            });
        });
    };
    return StaticPaginator;
}());
exports.StaticPaginator = StaticPaginator;
_StaticPaginator_items = new WeakMap(), _StaticPaginator_pageSize = new WeakMap(), _StaticPaginator_page = new WeakMap(), _StaticPaginator_ordering = new WeakMap();
