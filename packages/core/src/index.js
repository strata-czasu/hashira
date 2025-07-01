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
var _Hashira_exceptionHandlers, _Hashira_state, _Hashira_derive, _Hashira_const, _Hashira_methods, _Hashira_commands, _Hashira_userContextMenus, _Hashira_messageContextMenus, _Hashira_autocomplete, _Hashira_dependencies, _Hashira_name;
Object.defineProperty(exports, "__esModule", { value: true });
exports.decoratorInitBase = exports.Hashira = exports.PaginatedView = exports.waitForConfirmation = exports.ConfirmationDialog = void 0;
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var customEvents_1 = require("./customEvents");
var intents_1 = require("./intents");
var slashCommands_1 = require("./slashCommands");
var utils_1 = require("./utils");
var decoratorInitBase = {
    const: {},
    derive: {},
    state: {},
};
exports.decoratorInitBase = decoratorInitBase;
var commandsInitBase = {};
var handleCommandConflict = function (_c, _d) {
    var a = _c[0];
    var b = _d[0];
    throw new Error("Command ".concat(a.name, " with descriptiopn: ").concat(a.description, " conflicts with ").concat(b.name, " with description ").concat(b.description));
};
var handleContextMenuConflict = function (_c, _d) {
    var a = _c[0];
    var b = _d[0];
    throw new Error("Context menu ".concat(a.name, " conflicts with ").concat(b.name));
};
var takeIncomingOnConflict = function (_previous, current) {
    return current;
};
var handleAutoCompleteConflict = function (_a, _b, autoCompleteName) {
    throw new Error("There was a conflict with the autocomplete command ".concat(autoCompleteName));
};
var Hashira = /** @class */ (function () {
    function Hashira(options) {
        _Hashira_exceptionHandlers.set(this, void 0);
        _Hashira_state.set(this, void 0);
        _Hashira_derive.set(this, void 0);
        _Hashira_const.set(this, void 0);
        _Hashira_methods.set(this, void 0);
        _Hashira_commands.set(this, void 0);
        _Hashira_userContextMenus.set(this, void 0);
        _Hashira_messageContextMenus.set(this, void 0);
        _Hashira_autocomplete.set(this, void 0);
        _Hashira_dependencies.set(this, void 0);
        _Hashira_name.set(this, void 0);
        __classPrivateFieldSet(this, _Hashira_derive, [], "f");
        __classPrivateFieldSet(this, _Hashira_state, {}, "f");
        __classPrivateFieldSet(this, _Hashira_const, {}, "f");
        __classPrivateFieldSet(this, _Hashira_methods, new Map(), "f");
        __classPrivateFieldSet(this, _Hashira_commands, new Map(), "f");
        __classPrivateFieldSet(this, _Hashira_userContextMenus, new Map(), "f");
        __classPrivateFieldSet(this, _Hashira_messageContextMenus, new Map(), "f");
        __classPrivateFieldSet(this, _Hashira_autocomplete, new Map(), "f");
        __classPrivateFieldSet(this, _Hashira_exceptionHandlers, new Map(), "f");
        __classPrivateFieldSet(this, _Hashira_dependencies, [options.name], "f");
        __classPrivateFieldSet(this, _Hashira_name, options.name, "f");
    }
    // biome-ignore lint/complexity/noBannedTypes: Cannot use other more specific type here
    Hashira.prototype.const = function (name, value) {
        if (typeof name === "string") {
            __classPrivateFieldGet(this, _Hashira_const, "f")[name] = value;
            return this;
        }
        __classPrivateFieldSet(this, _Hashira_const, name(__classPrivateFieldGet(this, _Hashira_const, "f")), "f");
        return this;
    };
    Hashira.prototype.derive = function (transform) {
        __classPrivateFieldGet(this, _Hashira_derive, "f").push(transform);
        return this;
    };
    Hashira.prototype.state = function (name, value) {
        __classPrivateFieldGet(this, _Hashira_state, "f")[name] = value;
        return this;
    };
    Hashira.prototype.tapState = function (name, tapper) {
        tapper(__classPrivateFieldGet(this, _Hashira_state, "f")[name]);
        return this;
    };
    Hashira.prototype.use = function (instance) {
        // TODO: Handle dependencies as trees? So we can detect already added dependencies
        if (__classPrivateFieldGet(this, _Hashira_dependencies, "f").includes(__classPrivateFieldGet(instance, _Hashira_name, "f"))) {
            return this;
        }
        __classPrivateFieldSet(this, _Hashira_const, __assign(__assign({}, __classPrivateFieldGet(this, _Hashira_const, "f")), __classPrivateFieldGet(instance, _Hashira_const, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_derive, __spreadArray(__spreadArray([], __classPrivateFieldGet(this, _Hashira_derive, "f"), true), __classPrivateFieldGet(instance, _Hashira_derive, "f"), true), "f");
        __classPrivateFieldSet(this, _Hashira_state, __assign(__assign({}, __classPrivateFieldGet(this, _Hashira_state, "f")), __classPrivateFieldGet(instance, _Hashira_state, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_exceptionHandlers, (0, utils_1.mergeMap)(takeIncomingOnConflict, __classPrivateFieldGet(this, _Hashira_exceptionHandlers, "f"), __classPrivateFieldGet(instance, _Hashira_exceptionHandlers, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_methods, (0, utils_1.mergeMap)(function (a, b) { return __spreadArray(__spreadArray([], a, true), b, true); }, __classPrivateFieldGet(this, _Hashira_methods, "f"), __classPrivateFieldGet(instance, _Hashira_methods, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_commands, (0, utils_1.mergeMap)(handleCommandConflict, __classPrivateFieldGet(this, _Hashira_commands, "f"), __classPrivateFieldGet(instance, _Hashira_commands, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_userContextMenus, (0, utils_1.mergeMap)(handleContextMenuConflict, __classPrivateFieldGet(this, _Hashira_userContextMenus, "f"), __classPrivateFieldGet(instance, _Hashira_userContextMenus, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_messageContextMenus, (0, utils_1.mergeMap)(handleContextMenuConflict, __classPrivateFieldGet(this, _Hashira_messageContextMenus, "f"), __classPrivateFieldGet(instance, _Hashira_messageContextMenus, "f")), "f");
        __classPrivateFieldSet(this, _Hashira_autocomplete, (0, utils_1.mergeMap)(handleAutoCompleteConflict, __classPrivateFieldGet(this, _Hashira_autocomplete, "f"), __classPrivateFieldGet(instance, _Hashira_autocomplete, "f")), "f");
        __classPrivateFieldGet(this, _Hashira_dependencies, "f").push(__classPrivateFieldGet(instance, _Hashira_name, "f"));
        return this;
    };
    Hashira.prototype.context = function () {
        var ctx = __assign({ state: __classPrivateFieldGet(this, _Hashira_state, "f") }, __classPrivateFieldGet(this, _Hashira_const, "f"));
        for (var _i = 0, _c = __classPrivateFieldGet(this, _Hashira_derive, "f"); _i < _c.length; _i++) {
            var derive = _c[_i];
            Object.assign(ctx, derive(ctx));
        }
        return ctx;
    };
    Hashira.prototype.handle = function (methodName, method) {
        var _c;
        var methods = (_c = __classPrivateFieldGet(this, _Hashira_methods, "f").get(methodName)) !== null && _c !== void 0 ? _c : [];
        __classPrivateFieldGet(this, _Hashira_methods, "f").set(methodName, __spreadArray(__spreadArray([], methods, true), [method], false));
        return this;
    };
    Hashira.prototype.command = function (name, init) {
        var command = init(new slashCommands_1.TopLevelSlashCommand());
        var builder = command.toSlashCommandBuilder().setName(name);
        var handler = command.toHandler();
        __classPrivateFieldGet(this, _Hashira_commands, "f").set(name, [builder, handler]);
        var autocomplete = command.toAutocomplete();
        if (autocomplete)
            __classPrivateFieldGet(this, _Hashira_autocomplete, "f").set(name, autocomplete);
        return this;
    };
    Hashira.prototype.group = function (name, init) {
        var group = init(new slashCommands_1.Group(true));
        var builder = group.toSlashCommandBuilder().setName(name);
        __classPrivateFieldGet(this, _Hashira_commands, "f").set(name, [builder, group.toHandler()]);
        var autocomplete = group.toAutocomplete();
        if (autocomplete)
            __classPrivateFieldGet(this, _Hashira_autocomplete, "f").set(name, autocomplete);
        return this;
    };
    Hashira.prototype.userContextMenu = function (name, permissions, handler) {
        var builder = new discord_js_1.ContextMenuCommandBuilder()
            .setContexts(discord_js_1.InteractionContextType.BotDM)
            .setDefaultMemberPermissions(permissions)
            .setType(discord_js_1.ApplicationCommandType.User)
            .setName(name)
            .setNameLocalization("en-US", (0, es_toolkit_1.capitalize)(name));
        __classPrivateFieldGet(this, _Hashira_userContextMenus, "f").set(name, [
            builder,
            handler,
        ]);
        return this;
    };
    Hashira.prototype.messageContextMenu = function (name, permissions, handler) {
        var builder = new discord_js_1.ContextMenuCommandBuilder()
            .setContexts(discord_js_1.InteractionContextType.BotDM)
            .setDefaultMemberPermissions(permissions)
            .setType(discord_js_1.ApplicationCommandType.Message)
            .setName(name)
            .setNameLocalization("en-US", (0, es_toolkit_1.capitalize)(name));
        __classPrivateFieldGet(this, _Hashira_messageContextMenus, "f").set(name, [
            builder,
            handler,
        ]);
        return this;
    };
    Hashira.prototype.handleCommand = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var command, _, handler, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        command = __classPrivateFieldGet(this, _Hashira_commands, "f").get(interaction.commandName);
                        if (!command)
                            return [2 /*return*/];
                        _ = command[0], handler = command[1];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 8]);
                        return [4 /*yield*/, handler(this.context(), interaction)];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 3:
                        error_1 = _c.sent();
                        if (error_1 instanceof Error)
                            this.handleException(error_1, interaction);
                        if (!(interaction.replied || interaction.deferred)) return [3 /*break*/, 5];
                        return [4 /*yield*/, interaction.followUp({
                                content: "There was an error while executing this command!",
                                flags: "Ephemeral",
                            })];
                    case 4:
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, interaction.reply({
                            content: "There was an error while executing this command!",
                            flags: "Ephemeral",
                        })];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    Hashira.prototype.handleUserContextMenu = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var contextMenu, _, handler, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        contextMenu = __classPrivateFieldGet(this, _Hashira_userContextMenus, "f").get(interaction.commandName);
                        if (!contextMenu)
                            return [2 /*return*/];
                        _ = contextMenu[0], handler = contextMenu[1];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler(this.context(), interaction)];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _c.sent();
                        if (error_2 instanceof Error)
                            this.handleException(error_2, interaction);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Hashira.prototype.handleMessageContextMenu = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var contextMenu, _, handler, error_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        contextMenu = __classPrivateFieldGet(this, _Hashira_messageContextMenus, "f").get(interaction.commandName);
                        if (!contextMenu)
                            return [2 /*return*/];
                        _ = contextMenu[0], handler = contextMenu[1];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, handler(this.context(), interaction)];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _c.sent();
                        if (error_3 instanceof Error)
                            this.handleException(error_3, interaction);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Hashira.prototype.handleAutocomplete = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var handler, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        handler = __classPrivateFieldGet(this, _Hashira_autocomplete, "f").get(interaction.commandName);
                        if (!handler)
                            return [2 /*return*/];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 5]);
                        return [4 /*yield*/, handler(this.context(), interaction)];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        error_4 = _c.sent();
                        if (error_4 instanceof Error)
                            this.handleException(error_4, interaction);
                        return [4 /*yield*/, interaction.respond([])];
                    case 4:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Hashira.prototype.loadHandlers = function (discordClient) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _c, _d, event_1, handlers, _loop_1, _e, handlers_1, rawHandler;
            var _this = this;
            return __generator(this, function (_f) {
                for (_i = 0, _c = __classPrivateFieldGet(this, _Hashira_methods, "f"); _i < _c.length; _i++) {
                    _d = _c[_i], event_1 = _d[0], handlers = _d[1];
                    _loop_1 = function (rawHandler) {
                        if ((0, intents_1.isCustomEvent)(event_1)) {
                            var _g = (0, customEvents_1.handleCustomEvent)(event_1, rawHandler), discordEvent = _g[0], handler_1 = _g[1];
                            discordClient.on(discordEvent, function () {
                                var args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args[_i] = arguments[_i];
                                }
                                return handler_1.apply(void 0, __spreadArray([_this.context()], args, false));
                            });
                        }
                        else {
                            discordClient.on(event_1, function () {
                                var args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args[_i] = arguments[_i];
                                }
                                return rawHandler.apply(void 0, __spreadArray([_this.context()], args, false));
                            });
                        }
                    };
                    for (_e = 0, handlers_1 = handlers; _e < handlers_1.length; _e++) {
                        rawHandler = handlers_1[_e];
                        _loop_1(rawHandler);
                    }
                }
                discordClient.on("interactionCreate", function (interaction) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_c) {
                        if (interaction.isChatInputCommand())
                            return [2 /*return*/, this.handleCommand(interaction)];
                        if (interaction.isUserContextMenuCommand())
                            return [2 /*return*/, this.handleUserContextMenu(interaction)];
                        if (interaction.isMessageContextMenuCommand())
                            return [2 /*return*/, this.handleMessageContextMenu(interaction)];
                        if (interaction.isAutocomplete())
                            return [2 /*return*/, this.handleAutocomplete(interaction)];
                        return [2 /*return*/];
                    });
                }); });
                discordClient.on("error", function (error) { return _this.handleException(error); });
                return [2 /*return*/];
            });
        });
    };
    Hashira.prototype.addExceptionHandler = function (name, handler) {
        __classPrivateFieldGet(this, _Hashira_exceptionHandlers, "f").set(name, handler);
        return this;
    };
    Hashira.prototype.handleException = function (error, interaction) {
        for (var _i = 0, _c = __classPrivateFieldGet(this, _Hashira_exceptionHandlers, "f").values(); _i < _c.length; _i++) {
            var handler = _c[_i];
            handler(error, interaction);
        }
    };
    Hashira.prototype.start = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var intents, discordClient;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        intents = __spreadArray([], new Set(__spreadArray([], __classPrivateFieldGet(this, _Hashira_methods, "f").keys(), true).flatMap(function (event) { return intents_1.allEventsToIntent[event]; })), true);
                        discordClient = new discord_js_1.Client({
                            intents: intents,
                            allowedMentions: { repliedUser: true },
                            // NOTE: This is required to receive DMs
                            partials: [discord_js_1.Partials.Channel],
                        });
                        this.loadHandlers(discordClient);
                        return [4 /*yield*/, discordClient.login(token)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Hashira.prototype.registerCommands = function (token, guildIds, clientId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("Registering application commands for ".concat(guildIds.join(", "), "."));
                        return [4 /*yield*/, Promise.all(guildIds.map(function (guildId) { return _this.registerGuildCommands(token, guildId, clientId); }))];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Hashira.prototype.registerGuildCommands = function (token, guildId, clientId) {
        return __awaiter(this, void 0, void 0, function () {
            var rest, commands, contextMenus, currentCommands, commandsToDelete, error_5;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        rest = new discord_js_1.REST().setToken(token);
                        commands = __spreadArray([], __classPrivateFieldGet(this, _Hashira_commands, "f").values(), true).map(function (_c) {
                            var builder = _c[0];
                            return builder.toJSON();
                        });
                        contextMenus = __spreadArray(__spreadArray([], __classPrivateFieldGet(this, _Hashira_userContextMenus, "f").values(), true), __classPrivateFieldGet(this, _Hashira_messageContextMenus, "f").values(), true).map(function (_c) {
                            var builder = _c[0];
                            return builder.toJSON();
                        });
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, rest.get(discord_js_1.Routes.applicationGuildCommands(clientId, guildId))];
                    case 2:
                        currentCommands = (_c.sent());
                        commandsToDelete = currentCommands
                            .filter(function (command) {
                            return !__classPrivateFieldGet(_this, _Hashira_commands, "f").has(command.name) &&
                                !__classPrivateFieldGet(_this, _Hashira_userContextMenus, "f").has(command.name);
                        })
                            .map(function (_c) {
                            var id = _c.id;
                            return discord_js_1.Routes.applicationGuildCommand(clientId, guildId, id);
                        });
                        return [4 /*yield*/, Promise.all(commandsToDelete.map(function (route) { return rest.delete(route); }))];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, rest.put(discord_js_1.Routes.applicationGuildCommands(clientId, guildId), {
                                body: __spreadArray(__spreadArray([], commands, true), contextMenus, true),
                            })];
                    case 4:
                        _c.sent();
                        // TODO)) Log how much commands and context menus were registered
                        console.log("Successfully registered application commands for guild ".concat(guildId, "."));
                        return [3 /*break*/, 6];
                    case 5:
                        error_5 = _c.sent();
                        if (error_5 instanceof Error)
                            console.error(error_5);
                        console.error(error_5);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return Hashira;
}());
exports.Hashira = Hashira;
_Hashira_exceptionHandlers = new WeakMap(), _Hashira_state = new WeakMap(), _Hashira_derive = new WeakMap(), _Hashira_const = new WeakMap(), _Hashira_methods = new WeakMap(), _Hashira_commands = new WeakMap(), _Hashira_userContextMenus = new WeakMap(), _Hashira_messageContextMenus = new WeakMap(), _Hashira_autocomplete = new WeakMap(), _Hashira_dependencies = new WeakMap(), _Hashira_name = new WeakMap();
var confirmationDialog_1 = require("./confirmationDialog");
Object.defineProperty(exports, "ConfirmationDialog", { enumerable: true, get: function () { return confirmationDialog_1.ConfirmationDialog; } });
Object.defineProperty(exports, "waitForConfirmation", { enumerable: true, get: function () { return confirmationDialog_1.waitForConfirmation; } });
var paginatedView_1 = require("./paginatedView");
Object.defineProperty(exports, "PaginatedView", { enumerable: true, get: function () { return paginatedView_1.PaginatedView; } });
