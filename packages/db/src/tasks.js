"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var _MessageQueue_handlers, _MessageQueue_prisma, _MessageQueue_interval, _MessageQueue_running;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueue = void 0;
exports.getPendingTask = getPendingTask;
var date_fns_1 = require("date-fns");
function getPendingTask(tx) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, tx.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT * FROM \"task\" WHERE \"status\" = 'pending' AND \"handleAfter\" <= now() FOR UPDATE SKIP LOCKED LIMIT 1"], ["SELECT * FROM \"task\" WHERE \"status\" = 'pending' AND \"handleAfter\" <= now() FOR UPDATE SKIP LOCKED LIMIT 1"])))];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
var finishTask = function (tx, id) {
    return tx.task.update({ where: { id: id }, data: { status: "completed" } });
};
var failTask = function (tx, id) {
    return tx.task.update({ where: { id: id }, data: { status: "failed" } });
};
function isTaskData(data) {
    if (!data)
        return false;
    if (typeof data !== "object")
        return false;
    if (!("type" in data))
        return false;
    if (typeof data.type !== "string")
        return false;
    if (!("data" in data))
        return false;
    if (typeof data.data !== "object")
        return false;
    return true;
}
var initHandleTypes = {};
var handleDelay = function (delay, accordingTo) {
    if (delay instanceof Date)
        return delay;
    return (0, date_fns_1.addSeconds)(accordingTo !== null && accordingTo !== void 0 ? accordingTo : new Date(), delay);
};
var MessageQueue = /** @class */ (function () {
    function MessageQueue(prisma, interval) {
        if (interval === void 0) { interval = 1000; }
        _MessageQueue_handlers.set(this, new Map());
        _MessageQueue_prisma.set(this, void 0);
        _MessageQueue_interval.set(this, void 0);
        _MessageQueue_running.set(this, false);
        __classPrivateFieldSet(this, _MessageQueue_prisma, prisma, "f");
        __classPrivateFieldSet(this, _MessageQueue_interval, interval, "f");
    }
    MessageQueue.prototype.addHandler = function (type, handler) {
        __classPrivateFieldGet(this, _MessageQueue_handlers, "f").set(type, handler);
        return this;
    };
    MessageQueue.prototype.addArg = function () {
        return this;
    };
    /**
     * Enqueue a message to be handled later by the message queue using a new transaction
     * @param type {string} The type of message to be handled
     * @param data {unknown} The data to be handled
     * @param delay {number|Date} The delay in seconds before the message is handled
     * @param identifier {string} The identifier of the task
     */
    MessageQueue.prototype.push = function (type, data, delay, identifier) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pushTx(__classPrivateFieldGet(this, _MessageQueue_prisma, "f"), type, data, delay, identifier)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MessageQueue.prototype.pushTx = function (tx, type, data, delay, identifier) {
        return __awaiter(this, void 0, void 0, function () {
            var handleAfter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // This should never happen, but somehow typescript doesn't understand that
                        if (typeof type !== "string")
                            throw new Error("Type must be a string");
                        handleAfter = delay ? handleDelay(delay) : new Date();
                        return [4 /*yield*/, tx.task.create({
                                data: __assign({ data: { type: type, data: data }, handleAfter: handleAfter }, (identifier ? { identifier: identifier } : {})),
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel a task with the given identifier and type creating a transaction
     * @param type {string} The type of message to be handled
     * @param identifier {string} The identifier of the task
     * @param options {TaskFindOptions} Options for finding the task
     */
    MessageQueue.prototype.cancel = function (type, identifier, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cancelTx(__classPrivateFieldGet(this, _MessageQueue_prisma, "f"), type, identifier, options)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel a task with the given identifier and type
     * @param tx {PrismaTransaction} The transaction to use
     * @param type {string} The type of message to be handled
     * @param identifier {string} The identifier of the task
     * @param options {TaskFindOptions} Options for finding the task
     */
    MessageQueue.prototype.cancelTx = function (tx, type, identifier, options) {
        return __awaiter(this, void 0, void 0, function () {
            var task;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // This should never happen, but somehow typescript doesn't understand that
                        if (typeof type !== "string")
                            throw new Error("Type must be a string");
                        return [4 /*yield*/, tx.task.findFirst({
                                where: {
                                    identifier: identifier,
                                    status: "pending",
                                    data: { path: ["type"], equals: type },
                                },
                            })];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            if (options === null || options === void 0 ? void 0 : options.throwIfNotFound)
                                throw new Error("Task not found for identifier ".concat(identifier, " for type ").concat(type));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, tx.task.update({
                                where: { id: task.id },
                                data: { status: "cancelled" },
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the delay of a task
     * The endsAt value will be calculated from the original creation time of the task plus the new delay
     * @param type {string} The type of message to be handled
     * @param identifier {string} The identifier of the task
     * @param delay {number|Date} The delay in seconds before the message is handled
     */
    MessageQueue.prototype.updateDelay = function (type, identifier, delay, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.updateDelayTx(__classPrivateFieldGet(this, _MessageQueue_prisma, "f"), type, identifier, delay, options)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MessageQueue.prototype.updateDelayTx = function (tx, type, identifier, delay, options) {
        return __awaiter(this, void 0, void 0, function () {
            var task, handleAfter;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // This should never happen, but somehow typescript doesn't understand that
                        if (typeof type !== "string")
                            throw new Error("Type must be a string");
                        return [4 /*yield*/, tx.task.findFirst({
                                where: {
                                    identifier: identifier,
                                    status: "pending",
                                    data: { path: ["type"], equals: type },
                                },
                            })];
                    case 1:
                        task = _a.sent();
                        if (!task) {
                            if (options === null || options === void 0 ? void 0 : options.throwIfNotFound)
                                throw new Error("Task not found for identifier ".concat(identifier, " for type ").concat(type));
                            return [2 /*return*/];
                        }
                        handleAfter = handleDelay(delay, task.createdAt);
                        return [4 /*yield*/, tx.task.update({
                                where: { id: task.id },
                                data: { handleAfter: handleAfter },
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MessageQueue.prototype.handleTask = function (props, task) {
        return __awaiter(this, void 0, void 0, function () {
            var handler, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!isTaskData(task))
                            return [2 /*return*/, false];
                        handler = __classPrivateFieldGet(this, _MessageQueue_handlers, "f").get(task.type);
                        if (!handler)
                            return [2 /*return*/, false];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler(props, task.data)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        // TODO: proper logging
                        console.error(e_1);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, true];
                }
            });
        });
    };
    MessageQueue.prototype.innerConsumeLoop = function (props) {
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MessageQueue_prisma, "f").$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var task, handled;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getPendingTask(tx)];
                                        case 1:
                                            task = (_a.sent())[0];
                                            if (!task)
                                                return [2 /*return*/];
                                            return [4 /*yield*/, this.handleTask(props, task.data)];
                                        case 2:
                                            handled = _a.sent();
                                            if (!!handled) return [3 /*break*/, 4];
                                            return [4 /*yield*/, failTask(tx, task.id)];
                                        case 3:
                                            _a.sent();
                                            return [2 /*return*/];
                                        case 4: return [4 /*yield*/, finishTask(tx, task.id)];
                                        case 5:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_2 = _a.sent();
                        console.error(e_2);
                        return [3 /*break*/, 3];
                    case 3:
                        setTimeout(function () { return _this.innerConsumeLoop(props); }, __classPrivateFieldGet(this, _MessageQueue_interval, "f"));
                        return [2 /*return*/];
                }
            });
        });
    };
    MessageQueue.prototype.consumeLoop = function (props) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (__classPrivateFieldGet(this, _MessageQueue_running, "f"))
                            throw new Error("MessageQueue is already running");
                        __classPrivateFieldSet(this, _MessageQueue_running, true, "f");
                        return [4 /*yield*/, this.innerConsumeLoop(props)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return MessageQueue;
}());
exports.MessageQueue = MessageQueue;
_MessageQueue_handlers = new WeakMap(), _MessageQueue_prisma = new WeakMap(), _MessageQueue_interval = new WeakMap(), _MessageQueue_running = new WeakMap();
var templateObject_1;
