"use strict";
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
var _Cooldown_lastReset;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cooldown = void 0;
var date_fns_1 = require("date-fns");
var Cooldown = /** @class */ (function () {
    function Cooldown(duration) {
        _Cooldown_lastReset.set(this, void 0);
        this.duration = duration;
        __classPrivateFieldSet(this, _Cooldown_lastReset, new Date(0), "f");
    }
    Cooldown.prototype.ended = function (now) {
        if (now === void 0) { now = new Date(); }
        var endTime = (0, date_fns_1.add)(__classPrivateFieldGet(this, _Cooldown_lastReset, "f"), this.duration);
        if (now >= endTime) {
            __classPrivateFieldSet(this, _Cooldown_lastReset, now, "f");
            return true;
        }
        return false;
    };
    return Cooldown;
}());
exports.Cooldown = Cooldown;
_Cooldown_lastReset = new WeakMap();
