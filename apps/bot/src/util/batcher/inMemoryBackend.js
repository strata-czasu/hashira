"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _InMemoryBackend_items;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryBackend = void 0;
var InMemoryBackend = /** @class */ (function () {
    function InMemoryBackend() {
        _InMemoryBackend_items.set(this, new Map());
    }
    InMemoryBackend.prototype.initialize = function () {
        return;
    };
    Object.defineProperty(InMemoryBackend.prototype, "initialized", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    InMemoryBackend.prototype.push = function (key, item) {
        var _a;
        var itemsForKey = (_a = __classPrivateFieldGet(this, _InMemoryBackend_items, "f").get(key)) !== null && _a !== void 0 ? _a : [];
        itemsForKey.push(item);
        __classPrivateFieldGet(this, _InMemoryBackend_items, "f").set(key, itemsForKey);
    };
    InMemoryBackend.prototype.popn = function (key, n) {
        var itemsForKey = __classPrivateFieldGet(this, _InMemoryBackend_items, "f").get(key);
        if (!itemsForKey)
            return [];
        var batch = itemsForKey.splice(0, n);
        return batch;
    };
    InMemoryBackend.prototype.size = function (key) {
        var _a;
        var itemsForKey = __classPrivateFieldGet(this, _InMemoryBackend_items, "f").get(key);
        return (_a = itemsForKey === null || itemsForKey === void 0 ? void 0 : itemsForKey.length) !== null && _a !== void 0 ? _a : 0;
    };
    return InMemoryBackend;
}());
exports.InMemoryBackend = InMemoryBackend;
_InMemoryBackend_items = new WeakMap();
