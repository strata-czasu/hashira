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
var _DatabasePaginator_findFn, _DatabasePaginator_countFn, _DatabasePaginator_pageSize, _DatabasePaginator_ordering, _DatabasePaginator_page, _DatabasePaginator_count;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePaginator = void 0;
var paginate_1 = require("@hashira/paginate");
var DatabasePaginator = /** @class */ (function () {
    function DatabasePaginator(find, count, options) {
        _DatabasePaginator_findFn.set(this, void 0);
        _DatabasePaginator_countFn.set(this, void 0);
        _DatabasePaginator_pageSize.set(this, 10);
        _DatabasePaginator_ordering.set(this, paginate_1.PaginatorOrder.ASC);
        _DatabasePaginator_page.set(this, 0);
        _DatabasePaginator_count.set(this, Number.MAX_SAFE_INTEGER);
        __classPrivateFieldSet(this, _DatabasePaginator_findFn, find, "f");
        __classPrivateFieldSet(this, _DatabasePaginator_countFn, count, "f");
        if (options) {
            var _a = options.pageSize, pageSize = _a === void 0 ? 10 : _a, _b = options.defaultOrder, defaultOrder = _b === void 0 ? paginate_1.PaginatorOrder.ASC : _b;
            __classPrivateFieldSet(this, _DatabasePaginator_pageSize, pageSize, "f");
            __classPrivateFieldSet(this, _DatabasePaginator_ordering, defaultOrder, "f");
        }
    }
    DatabasePaginator.prototype.fetchCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.isCountUnknown)
                            return [2 /*return*/];
                        _a = [this, _DatabasePaginator_count];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _DatabasePaginator_countFn, "f").call(this)];
                    case 1:
                        __classPrivateFieldSet.apply(void 0, _a.concat([_b.sent(), "f"]));
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(DatabasePaginator.prototype, "count", {
        get: function () {
            if (this.isCountUnknown)
                return null;
            return __classPrivateFieldGet(this, _DatabasePaginator_count, "f");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DatabasePaginator.prototype, "currentOffset", {
        get: function () {
            return __classPrivateFieldGet(this, _DatabasePaginator_page, "f") * __classPrivateFieldGet(this, _DatabasePaginator_pageSize, "f");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DatabasePaginator.prototype, "displayPages", {
        get: function () {
            if (this.isCountUnknown)
                return "?";
            return Math.ceil(__classPrivateFieldGet(this, _DatabasePaginator_count, "f") / __classPrivateFieldGet(this, _DatabasePaginator_pageSize, "f")).toString();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DatabasePaginator.prototype, "displayCurrentPage", {
        get: function () {
            return (__classPrivateFieldGet(this, _DatabasePaginator_page, "f") + 1).toString();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DatabasePaginator.prototype, "canPrevious", {
        get: function () {
            return __classPrivateFieldGet(this, _DatabasePaginator_page, "f") > 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DatabasePaginator.prototype, "canNext", {
        get: function () {
            return (__classPrivateFieldGet(this, _DatabasePaginator_page, "f") + 1) * __classPrivateFieldGet(this, _DatabasePaginator_pageSize, "f") < __classPrivateFieldGet(this, _DatabasePaginator_count, "f");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DatabasePaginator.prototype, "prismaOrdering", {
        get: function () {
            if (__classPrivateFieldGet(this, _DatabasePaginator_ordering, "f") === paginate_1.PaginatorOrder.ASC)
                return "asc";
            return "desc";
        },
        enumerable: false,
        configurable: true
    });
    DatabasePaginator.prototype.current = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.fetchCount()];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, __classPrivateFieldGet(this, _DatabasePaginator_findFn, "f").call(this, {
                                skip: this.currentOffset,
                                take: __classPrivateFieldGet(this, _DatabasePaginator_pageSize, "f"),
                            }, this.prismaOrdering)];
                    case 2:
                        result = _b.sent();
                        if (this.isCountUnknown && result.length < __classPrivateFieldGet(this, _DatabasePaginator_pageSize, "f")) {
                            __classPrivateFieldSet(this, _DatabasePaginator_count, this.currentOffset + result.length, "f");
                            __classPrivateFieldSet(this, _DatabasePaginator_page, (_a = __classPrivateFieldGet(this, _DatabasePaginator_page, "f"), _a--, _a), "f");
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    DatabasePaginator.prototype.reorder = function (orderBy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (orderBy)
                            __classPrivateFieldSet(this, _DatabasePaginator_ordering, orderBy, "f");
                        else
                            __classPrivateFieldSet(this, _DatabasePaginator_ordering, (0, paginate_1.toggleOrder)(__classPrivateFieldGet(this, _DatabasePaginator_ordering, "f")), "f");
                        __classPrivateFieldSet(this, _DatabasePaginator_page, 0, "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabasePaginator.prototype.next = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.canNext)
                            return [2 /*return*/, []];
                        __classPrivateFieldSet(this, _DatabasePaginator_page, (_a = __classPrivateFieldGet(this, _DatabasePaginator_page, "f"), _a++, _a), "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    DatabasePaginator.prototype.previous = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.canPrevious)
                            return [2 /*return*/, []];
                        __classPrivateFieldSet(this, _DatabasePaginator_page, (_a = __classPrivateFieldGet(this, _DatabasePaginator_page, "f"), _a--, _a), "f");
                        return [4 /*yield*/, this.current()];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    Object.defineProperty(DatabasePaginator.prototype, "isCountUnknown", {
        get: function () {
            return __classPrivateFieldGet(this, _DatabasePaginator_count, "f") === Number.MAX_SAFE_INTEGER;
        },
        enumerable: false,
        configurable: true
    });
    return DatabasePaginator;
}());
exports.DatabasePaginator = DatabasePaginator;
_DatabasePaginator_findFn = new WeakMap(), _DatabasePaginator_countFn = new WeakMap(), _DatabasePaginator_pageSize = new WeakMap(), _DatabasePaginator_ordering = new WeakMap(), _DatabasePaginator_page = new WeakMap(), _DatabasePaginator_count = new WeakMap();
