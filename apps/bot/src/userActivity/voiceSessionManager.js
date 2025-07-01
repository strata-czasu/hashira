"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.VoiceSessionManager = void 0;
var range_1 = require("@hashira/utils/range");
var date_fns_1 = require("date-fns");
var v = require("valibot");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var schema_1 = require("./voiceSession/schema");
var stateRange = (0, range_1.range)(0, 32);
var VoiceSessionManager = /** @class */ (function () {
    function VoiceSessionManager(redis, prisma) {
        this.redis = redis;
        this.prisma = prisma;
    }
    VoiceSessionManager.prototype.getSessionKey = function (guildId, userId) {
        return "voiceSession:".concat(guildId, ":").concat(userId);
    };
    VoiceSessionManager.prototype.tryUpdateSession = function (session) {
        var updatedSession = session;
        // Fix invalid data from version 1
        if (updatedSession.version === "1") {
            updatedSession = __assign(__assign({}, updatedSession), { totalActiveStreamingSeconds: 0, totalActiveVideoSeconds: 0, version: "2" });
        }
        // Migrate from version 2 to version 3, remove old data because it's not easily mappable
        if (updatedSession.version === "2") {
            updatedSession = {
                channelId: updatedSession.channelId,
                joinedAt: updatedSession.joinedAt,
                lastUpdate: updatedSession.lastUpdate,
                state: 0,
                version: "3",
            };
        }
        return updatedSession;
    };
    VoiceSessionManager.prototype.getVoiceSession = function (guildId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var key, sessionRaw, sessionResult, flatIssues, updatedSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = this.getSessionKey(guildId, userId);
                        return [4 /*yield*/, this.redis.hGetAll(key)];
                    case 1:
                        sessionRaw = _a.sent();
                        // If the session is empty, then it doesn't exist
                        if (Object.keys(sessionRaw).length === 0)
                            return [2 /*return*/, null];
                        sessionResult = v.safeParse(schema_1.AnyVersionVoiceSessionSchema, sessionRaw);
                        if (!sessionResult.success) {
                            flatIssues = v.flatten(sessionResult.issues);
                            throw new Error("Invalid voice session data: ".concat(JSON.stringify(flatIssues)));
                        }
                        updatedSession = this.tryUpdateSession(sessionResult.output);
                        if (!(sessionResult.output.version !== schema_1.VERSION)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.redis.hSet(key, this.serializeVoiceSessionForRedis(updatedSession))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, updatedSession];
                }
            });
        });
    };
    VoiceSessionManager.prototype.updateVoiceSessionData = function (guildId, userId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var session, updatedSession, key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getVoiceSession(guildId, userId)];
                    case 1:
                        session = _a.sent();
                        if (!session)
                            return [2 /*return*/, null];
                        updatedSession = __assign(__assign({}, session), updates);
                        key = this.getSessionKey(guildId, userId);
                        console.log("[Redis Update] Updating session data for ".concat(key), updates);
                        return [4 /*yield*/, this.redis.hSet(key, this.serializeVoiceSessionForRedis(updatedSession))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, updatedSession];
                }
            });
        });
    };
    VoiceSessionManager.prototype.serializeVoiceSessionForPrisma = function (session, userId, guildId, leftAt) {
        var totals = [];
        for (var _i = 0, stateRange_1 = stateRange; _i < stateRange_1.length; _i++) {
            var i = stateRange_1[_i];
            var key = "total_".concat(i);
            var value = session[key];
            if (value && value > 0) {
                totals.push(__assign(__assign({}, this.decodeState(i)), { secondsSpent: value }));
            }
        }
        return {
            channelId: session.channelId,
            joinedAt: session.joinedAt,
            leftAt: leftAt,
            user: { connectOrCreate: { where: { id: userId }, create: { id: userId } } },
            guild: { connectOrCreate: { where: { id: guildId }, create: { id: guildId } } },
            totals: {
                createMany: { data: totals },
            },
        };
    };
    VoiceSessionManager.prototype.serializeVoiceSessionForRedis = function (session) {
        var _a;
        // Only include total_{i} fields that have non-zero values or are the current state
        var result = {
            channelId: session.channelId,
            joinedAt: session.joinedAt.toISOString(),
            lastUpdate: session.lastUpdate.toISOString(),
            state: "".concat(session.state),
            version: session.version,
        };
        for (var _i = 0, stateRange_2 = stateRange; _i < stateRange_2.length; _i++) {
            var i = stateRange_2[_i];
            var key = "total_".concat(i);
            var value = (_a = session[key]) !== null && _a !== void 0 ? _a : 0;
            if (value > 0) {
                result[key] = String(value);
            }
        }
        return result;
    };
    VoiceSessionManager.prototype.updateSessionTimes = function (session, delta) {
        var _a;
        session["total_".concat(session.state)] =
            ((_a = session["total_".concat(session.state)]) !== null && _a !== void 0 ? _a : 0) + delta;
    };
    VoiceSessionManager.prototype.voiceStateAlone = function (state) {
        var _a;
        if (((_a = state.channel) === null || _a === void 0 ? void 0 : _a.members.size) !== 1)
            return false;
        return state.channel.members.has(state.id);
    };
    VoiceSessionManager.prototype.encodeState = function (state) {
        var value = 0;
        if (state.mute)
            value |= 1;
        if (state.deaf)
            value |= 2;
        if (state.streaming)
            value |= 4;
        if (state.selfVideo)
            value |= 8;
        if (this.voiceStateAlone(state))
            value |= 16;
        return value;
    };
    VoiceSessionManager.prototype.decodeState = function (value) {
        return {
            isMuted: (value & 1) !== 0,
            isDeafened: (value & 2) !== 0,
            isStreaming: (value & 4) !== 0,
            isVideo: (value & 8) !== 0,
            isAlone: (value & 16) !== 0,
        };
    };
    VoiceSessionManager.prototype.updateRemainingUsersAfterLeave = function (channel) {
        return __awaiter(this, void 0, void 0, function () {
            var remainingUser, actualVoiceState;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(channel.members.size === 1)) return [3 /*break*/, 2];
                        remainingUser = channel.members.first();
                        if (!(remainingUser === null || remainingUser === void 0 ? void 0 : remainingUser.voice)) return [3 /*break*/, 2];
                        actualVoiceState = remainingUser.voice;
                        if (!(((_a = actualVoiceState.channel) === null || _a === void 0 ? void 0 : _a.id) === channel.id)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.updateVoiceSession(actualVoiceState)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.updateUsersAfterJoin = function (channel, excludeUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, member;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!(channel.members.size > 1)) return [3 /*break*/, 4];
                        _i = 0, _a = channel.members;
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], member = _b[1];
                        if (!((member === null || member === void 0 ? void 0 : member.voice) &&
                            ((_c = member.voice.channel) === null || _c === void 0 ? void 0 : _c.id) === channel.id &&
                            member.id !== excludeUserId)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.updateVoiceSession(member.voice)];
                    case 2:
                        _d.sent();
                        _d.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.startVoiceSession = function (channelId, state) {
        return __awaiter(this, void 0, void 0, function () {
            var now, key, voiceSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        key = this.getSessionKey(state.guild.id, state.id);
                        voiceSession = {
                            version: schema_1.VERSION,
                            channelId: channelId,
                            joinedAt: now,
                            lastUpdate: now,
                            state: this.encodeState(state),
                        };
                        return [4 /*yield*/, this.redis.hSet(key, this.serializeVoiceSessionForRedis(voiceSession))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.updateVoiceSession = function (newState) {
        return __awaiter(this, void 0, void 0, function () {
            var guildId, userId, key, session, now, delta;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        guildId = newState.guild.id;
                        userId = newState.id;
                        key = this.getSessionKey(guildId, userId);
                        return [4 /*yield*/, this.getVoiceSession(guildId, userId)];
                    case 1:
                        session = _a.sent();
                        if (!!session) return [3 /*break*/, 3];
                        if (!newState.channel)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.startVoiceSession(newState.channel.id, newState)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        now = new Date();
                        delta = (0, date_fns_1.differenceInSeconds)(now, session.lastUpdate);
                        this.updateSessionTimes(session, delta);
                        session.state = this.encodeState(newState);
                        session.lastUpdate = now;
                        return [4 /*yield*/, this.redis.hSet(key, this.serializeVoiceSessionForRedis(session))];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.endVoiceSession = function (state, leftAt) {
        return __awaiter(this, void 0, void 0, function () {
            var guildId, userId, key, session, delta, voiceSessionRecord;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        guildId = state.guild.id;
                        userId = state.id;
                        key = this.getSessionKey(guildId, userId);
                        return [4 /*yield*/, this.getVoiceSession(guildId, userId)];
                    case 1:
                        session = _a.sent();
                        if (!session) {
                            throw new Error("Session for ending not found: ".concat(key, ". This should not happen."));
                        }
                        delta = (0, date_fns_1.differenceInSeconds)(leftAt, session.lastUpdate);
                        this.updateSessionTimes(session, delta);
                        voiceSessionRecord = this.serializeVoiceSessionForPrisma(session, userId, guildId, leftAt);
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(this.prisma, state.id)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.prisma.voiceSession.create({ data: voiceSessionRecord })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.redis.del(key)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.handleVoiceState = function (voiceState) {
        return __awaiter(this, void 0, void 0, function () {
            var key, session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!voiceState.channel)
                            return [2 /*return*/, []];
                        key = this.getSessionKey(voiceState.guild.id, voiceState.id);
                        return [4 /*yield*/, this.getVoiceSession(voiceState.guild.id, voiceState.id)];
                    case 1:
                        session = _a.sent();
                        if (!!session) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.startVoiceSession(voiceState.channel.id, voiceState)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, [key]];
                    case 3:
                        if (!(session.channelId === voiceState.channel.id)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.updateVoiceSession(voiceState)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 5: 
                    // We don't have a way to get the leftAt time, so we use the lastUpdate time
                    return [4 /*yield*/, this.endVoiceSession(voiceState, session.lastUpdate)];
                    case 6:
                        // We don't have a way to get the leftAt time, so we use the lastUpdate time
                        _a.sent();
                        return [4 /*yield*/, this.startVoiceSession(voiceState.channel.id, voiceState)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/, [key]];
                }
            });
        });
    };
    VoiceSessionManager.prototype.handleOrphanedSession = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, guildId, userId, session, voiceSession, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = key.split(":"), guildId = _a[1], userId = _a[2];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        if (!guildId || !userId) {
                            throw new Error("Invalid session key: ".concat(key));
                        }
                        return [4 /*yield*/, this.getVoiceSession(guildId, userId)];
                    case 2:
                        session = _b.sent();
                        if (!session)
                            return [2 /*return*/];
                        voiceSession = this.serializeVoiceSessionForPrisma(session, userId, guildId, session.lastUpdate);
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(this.prisma, userId)];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, this.prisma.voiceSession.create({ data: voiceSession })];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, this.redis.del(key)];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _b.sent();
                        console.error("Failed to process orphaned session ".concat(key, ":"), error_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.handleNewGuild = function (guild) {
        return __awaiter(this, void 0, void 0, function () {
            var allFoundSessions, foundSessions, sessionPattern, allSessionKeys, orphanedSessions;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(guild.voiceStates.cache.map(function (voiceState) {
                            return _this.handleVoiceState(voiceState);
                        }))];
                    case 1:
                        allFoundSessions = _a.sent();
                        foundSessions = allFoundSessions.flat();
                        sessionPattern = "voiceSession:".concat(guild.id, ":*");
                        return [4 /*yield*/, this.redis.keys(sessionPattern)];
                    case 2:
                        allSessionKeys = _a.sent();
                        orphanedSessions = allSessionKeys.filter(function (key) { return !foundSessions.includes(key); });
                        return [4 /*yield*/, Promise.all(orphanedSessions.map(function (key) { return _this.handleOrphanedSession(key); }))];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    VoiceSessionManager.prototype.handleVoiceStateUpdate = function (oldState, newState) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(!oldState.channel && newState.channel)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.startVoiceSession(newState.channel.id, newState)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.updateUsersAfterJoin(newState.channel, newState.id)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                    case 3:
                        if (!(oldState.channel && !newState.channel)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.updateRemainingUsersAfterLeave(oldState.channel)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.endVoiceSession(newState, new Date())];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        if (!(oldState.channel && newState.channel)) return [3 /*break*/, 13];
                        if (!(oldState.channel.id !== newState.channel.id)) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.updateRemainingUsersAfterLeave(oldState.channel)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.endVoiceSession(newState, new Date())];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.startVoiceSession(newState.channel.id, newState)];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, this.updateUsersAfterJoin(newState.channel, newState.id)];
                    case 10:
                        _a.sent();
                        return [2 /*return*/];
                    case 11: return [4 /*yield*/, this.updateVoiceSession(newState)];
                    case 12: 
                    // Same channel, just updating state
                    return [2 /*return*/, _a.sent()];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    return VoiceSessionManager;
}());
exports.VoiceSessionManager = VoiceSessionManager;
