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
exports.RedisBackend = exports.InMemoryBackend = exports.Batcher = void 0;
var bun_1 = require("bun");
var duration_1 = require("../duration");
var Batcher = /** @class */ (function () {
    function Batcher(processBatch, options) {
        this.processing = new Map();
        this.enabled = false;
        this.backend = options.backend;
        this.interval = (0, duration_1.durationToMilliseconds)(options.interval);
        this.batchSize = options.batchSize;
        this.processBatch = processBatch;
    }
    Batcher.prototype.push = function (key, item) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.backend.initialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.backend.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.backend.push(key, item)];
                    case 3:
                        _a.sent();
                        if (!this.processing.get(key)) {
                            this.startProcessing(key);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Batcher.prototype.startProcessing = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var batch, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.enabled)
                            return [2 /*return*/];
                        this.processing.set(key, true);
                        _a.label = 1;
                    case 1: return [4 /*yield*/, this.backend.size(key)];
                    case 2:
                        if (!_a.sent()) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, bun_1.sleep)(this.interval)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.backend.popn(key, this.batchSize)];
                    case 4:
                        batch = _a.sent();
                        if (!batch)
                            return [2 /*return*/];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.processBatch(key, batch)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        console.error("Error processing batch for key ".concat(key, ":"), error_1);
                        return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 1];
                    case 9:
                        this.processing.set(key, false);
                        return [2 /*return*/];
                }
            });
        });
    };
    Batcher.prototype.start = function () {
        this.enabled = true;
    };
    return Batcher;
}());
exports.Batcher = Batcher;
var inMemoryBackend_1 = require("./inMemoryBackend");
Object.defineProperty(exports, "InMemoryBackend", { enumerable: true, get: function () { return inMemoryBackend_1.InMemoryBackend; } });
var redisBackend_1 = require("./redisBackend");
Object.defineProperty(exports, "RedisBackend", { enumerable: true, get: function () { return redisBackend_1.RedisBackend; } });
