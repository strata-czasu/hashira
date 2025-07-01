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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LockManager_locks;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockManager = void 0;
var LockManager = /** @class */ (function () {
    function LockManager() {
        _LockManager_locks.set(this, new Map());
    }
    LockManager.prototype.acquire = function (key) {
        if (__classPrivateFieldGet(this, _LockManager_locks, "f").has(key))
            return false;
        __classPrivateFieldGet(this, _LockManager_locks, "f").set(key, key);
        return true;
    };
    LockManager.prototype.release = function (key) {
        return __classPrivateFieldGet(this, _LockManager_locks, "f").delete(key);
    };
    LockManager.prototype.isLocked = function (key) {
        return __classPrivateFieldGet(this, _LockManager_locks, "f").has(key);
    };
    /**
     * Run a function if a lock is free. This can be used as a keyed mutex.
     *
     * @param key List of keys to acquire before running the function
     * @param fn Function to run if all keys were free
     * @param lockInUseFn Function to run if any key was in use
     * @returns The result of the function that was run
     */
    LockManager.prototype.run = function (key, fn, lockInUseFn) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (key.length === 0)
                            throw new Error("Key must not be empty");
                        if (!!key.every(function (k) { return !_this.isLocked(k); })) return [3 /*break*/, 2];
                        return [4 /*yield*/, lockInUseFn()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        if (!key.every(function (k) { return _this.acquire(k); })) {
                            throw new Error("Failed to acquire lock(s)");
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, , 5, 6]);
                        return [4 /*yield*/, fn()];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5:
                        key.every(function (k) { return _this.release(k); });
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return LockManager;
}());
exports.LockManager = LockManager;
_LockManager_locks = new WeakMap();
