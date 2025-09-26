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
var _Logger_messageTypes, _Logger_batcher, _Logger_logChannels, _Logger_client;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
var batcher_1 = require("../../util/batcher");
var initLogMessageTypes = {};
var Logger = /** @class */ (function () {
    function Logger() {
        _Logger_messageTypes.set(this, new Map());
        _Logger_batcher.set(this, void 0);
        _Logger_logChannels.set(this, new Map());
        _Logger_client.set(this, null);
        __classPrivateFieldSet(this, _Logger_batcher, new batcher_1.Batcher(this.processBatch.bind(this), {
            interval: { seconds: 5 },
            batchSize: 5,
            backend: new batcher_1.InMemoryBackend(),
        }), "f");
    }
    /**
     * Register a new log message type and define how it will be formatted
     * @param type Unique log message name
     * @param handler Function to format a log message as string
     */
    Logger.prototype.addMessageType = function (type, handler) {
        __classPrivateFieldGet(this, _Logger_messageTypes, "f").set(type, handler);
        return this;
    };
    Logger.prototype.isRegistered = function (guild) {
        return __classPrivateFieldGet(this, _Logger_logChannels, "f").has(guild.id);
    };
    Logger.prototype.updateGuild = function (guild, logChannel) {
        __classPrivateFieldGet(this, _Logger_logChannels, "f").set(guild.id, logChannel);
    };
    /**
     * Push a log message
     * @param type {string} Log message type
     * @param guild {Guild} Guild where the log message originated
     * @param data {unknown} Data for the log message
     */
    Logger.prototype.push = function (type, guild, data) {
        if (typeof type !== "string")
            throw new Error("Type must be a string");
        __classPrivateFieldGet(this, _Logger_batcher, "f").push(guild.id, { type: type, data: data, timestamp: new Date() });
    };
    Logger.prototype.formatLogMessage = function (client_1, _a) {
        return __awaiter(this, arguments, void 0, function (client, _b) {
            var handler;
            var type = _b.type, data = _b.data, timestamp = _b.timestamp;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (typeof type !== "string")
                            throw new Error("Type must be a string");
                        handler = __classPrivateFieldGet(this, _Logger_messageTypes, "f").get(type);
                        if (!handler)
                            throw new Error("Handler not found for ".concat(type));
                        return [4 /*yield*/, handler({ client: client, timestamp: timestamp }, data)];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    Logger.prototype.getLogChannel = function (guild) {
        return __awaiter(this, void 0, void 0, function () {
            var logChannel;
            return __generator(this, function (_a) {
                logChannel = __classPrivateFieldGet(this, _Logger_logChannels, "f").get(guild.id);
                if (!(logChannel === null || logChannel === void 0 ? void 0 : logChannel.isSendable())) {
                    throw new Error("Log channel for guild ".concat(guild.id, " not initialized"));
                }
                return [2 /*return*/, logChannel];
            });
        });
    };
    Logger.prototype.processBatch = function (guildId, messages) {
        return __awaiter(this, void 0, void 0, function () {
            var client, guild, channel, formatted;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = __classPrivateFieldGet(this, _Logger_client, "f");
                        if (!client)
                            throw new Error("Client not initialized");
                        return [4 /*yield*/, client.guilds.fetch(guildId)];
                    case 1:
                        guild = _a.sent();
                        return [4 /*yield*/, this.getLogChannel(guild)];
                    case 2:
                        channel = _a.sent();
                        return [4 /*yield*/, Promise.all(messages.map(function (m) { return _this.formatLogMessage(client, m); }))];
                    case 3:
                        formatted = _a.sent();
                        return [4 /*yield*/, channel.send({ embeds: formatted })];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Logger.prototype.start = function (client) {
        __classPrivateFieldSet(this, _Logger_client, client, "f");
        __classPrivateFieldGet(this, _Logger_batcher, "f").start();
    };
    return Logger;
}());
exports.Logger = Logger;
_Logger_messageTypes = new WeakMap(), _Logger_batcher = new WeakMap(), _Logger_logChannels = new WeakMap(), _Logger_client = new WeakMap();
