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
var _Group_instances, _Group_builder, _Group_handlers, _Group_autocompleteHandlers, _Group_flattenHandlers, _Group_flattenAutocompleteHandlers, _SlashCommand_builder, _SlashCommand_options, _SlashCommand_handler, _SlashCommand_autocomplete;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopLevelSlashCommand = exports.SlashCommand = exports.commandSettingsInitBase = exports.Group = exports.optionsInitBase = void 0;
var discord_js_1 = require("discord.js");
var attachmentOptionBuilder_1 = require("./attachmentOptionBuilder");
var booleanOptionBuilder_1 = require("./booleanOptionBuilder");
var channelOptionBuilder_1 = require("./channelOptionBuilder");
var integerOptionBuilder_1 = require("./integerOptionBuilder");
var numberOptionBuilder_1 = require("./numberOptionBuilder");
var roleOptionBuilder_1 = require("./roleOptionBuilder");
var stringOptionBuilder_1 = require("./stringOptionBuilder");
var userOptionBuilder_1 = require("./userOptionBuilder");
exports.optionsInitBase = {};
var groupSettingsInitBase = {
    HasDescription: false,
    TopLevel: true,
};
var Group = /** @class */ (function () {
    function Group(topLevel) {
        _Group_instances.add(this);
        _Group_builder.set(this, void 0);
        _Group_handlers.set(this, {});
        _Group_autocompleteHandlers.set(this, {});
        this._topLevel = topLevel;
        if (this._topLevel) {
            __classPrivateFieldSet(this, _Group_builder, new discord_js_1.SlashCommandBuilder(), "f");
        }
        else {
            __classPrivateFieldSet(this, _Group_builder, new discord_js_1.SlashCommandSubcommandGroupBuilder(), "f");
        }
    }
    Group.prototype.setDescription = function (description) {
        __classPrivateFieldGet(this, _Group_builder, "f").setDescription(description);
        return this;
    };
    Group.prototype.setDefaultMemberPermissions = function (permission) {
        if (!(__classPrivateFieldGet(this, _Group_builder, "f") instanceof discord_js_1.SlashCommandBuilder))
            throw new Error("Cannot set default permission on a non-top-level group");
        __classPrivateFieldGet(this, _Group_builder, "f").setDefaultMemberPermissions(permission);
        return this;
    };
    Group.prototype.setDMPermission = function (enabled) {
        if (!(__classPrivateFieldGet(this, _Group_builder, "f") instanceof discord_js_1.SlashCommandBuilder))
            throw new Error("Cannot set DM permission on a non-top-level group");
        __classPrivateFieldGet(this, _Group_builder, "f").setDMPermission(enabled);
        return this;
    };
    Group.prototype.addCommand = function (name, input) {
        var command = input(new SlashCommand());
        var commandBuilder = command.toSlashCommandBuilder().setName(name);
        __classPrivateFieldGet(this, _Group_builder, "f").addSubcommand(commandBuilder);
        __classPrivateFieldGet(this, _Group_handlers, "f")[name] = command.toHandler();
        var autocomplete = command.toAutocomplete();
        if (autocomplete)
            __classPrivateFieldGet(this, _Group_autocompleteHandlers, "f")[name] = autocomplete;
        return this;
    };
    Group.prototype.addGroup = function (name, input) {
        if (!this._topLevel)
            throw new Error("Cannot add a group to a non-top-level group");
        if (!(__classPrivateFieldGet(this, _Group_builder, "f") instanceof discord_js_1.SlashCommandBuilder))
            throw new Error("Cannot add a group to a non-top-level group");
        var group = input(new Group(false));
        var builder = group.toSlashCommandBuilder().setName(name);
        __classPrivateFieldGet(this, _Group_builder, "f").addSubcommandGroup(builder);
        __classPrivateFieldGet(this, _Group_handlers, "f")[name] = __classPrivateFieldGet(group, _Group_handlers, "f");
        __classPrivateFieldGet(this, _Group_autocompleteHandlers, "f")[name] = __classPrivateFieldGet(group, _Group_autocompleteHandlers, "f");
        return this;
    };
    Group.prototype.toSlashCommandBuilder = function () {
        return __classPrivateFieldGet(this, _Group_builder, "f");
    };
    Group.prototype.toHandler = function () {
        var _this = this;
        if (!this._topLevel)
            throw new Error("Cannot get handler for non-top-level group");
        var handlers = __classPrivateFieldGet(this, _Group_instances, "m", _Group_flattenHandlers).call(this, __classPrivateFieldGet(this, _Group_handlers, "f"));
        return (function (ctx, int) { return __awaiter(_this, void 0, void 0, function () {
            var group, command, qualifiedName, handler;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        group = int.options.getSubcommandGroup(false);
                        command = int.options.getSubcommand(false);
                        qualifiedName = [group, command].filter(Boolean).join(".");
                        handler = handlers[qualifiedName];
                        if (!handler)
                            throw new Error("No handler found for ".concat(qualifiedName));
                        return [4 /*yield*/, handler(ctx, int)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    Group.prototype.toAutocomplete = function () {
        var _this = this;
        if (!this._topLevel)
            throw new Error("Cannot get handler for non-top-level group");
        var handlers = __classPrivateFieldGet(this, _Group_instances, "m", _Group_flattenAutocompleteHandlers).call(this, __classPrivateFieldGet(this, _Group_autocompleteHandlers, "f"));
        return (function (ctx, int) { return __awaiter(_this, void 0, void 0, function () {
            var group, command, qualifiedName, handler;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        group = int.options.getSubcommandGroup(false);
                        command = int.options.getSubcommand(false);
                        qualifiedName = [group, command].filter(Boolean).join(".");
                        handler = handlers[qualifiedName];
                        if (!handler)
                            return [2 /*return*/];
                        return [4 /*yield*/, handler(ctx, int)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return Group;
}());
exports.Group = Group;
_Group_builder = new WeakMap(), _Group_handlers = new WeakMap(), _Group_autocompleteHandlers = new WeakMap(), _Group_instances = new WeakSet(), _Group_flattenHandlers = function _Group_flattenHandlers(handlers) {
    var result = {};
    for (var _i = 0, _a = Object.entries(handlers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (typeof value === "function") {
            result[key] = value;
        }
        else {
            for (var _c = 0, _d = Object.entries(__classPrivateFieldGet(this, _Group_instances, "m", _Group_flattenHandlers).call(this, value)); _c < _d.length; _c++) {
                var _e = _d[_c], subKey = _e[0], subValue = _e[1];
                result["".concat(key, ".").concat(subKey)] = subValue;
            }
        }
    }
    return result;
}, _Group_flattenAutocompleteHandlers = function _Group_flattenAutocompleteHandlers(handlers) {
    var result = {};
    for (var _i = 0, _a = Object.entries(handlers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (typeof value === "function") {
            result[key] = value;
        }
        else {
            for (var _c = 0, _d = Object.entries(__classPrivateFieldGet(this, _Group_instances, "m", _Group_flattenAutocompleteHandlers).call(this, value)); _c < _d.length; _c++) {
                var _e = _d[_c], subKey = _e[0], subValue = _e[1];
                result["".concat(key, ".").concat(subKey)] = subValue;
            }
        }
    }
    return result;
};
exports.commandSettingsInitBase = {
    HasDescription: false,
    HasHandler: false,
};
// TODO: Disable the ability to add required options if non-required options are present
var SlashCommand = /** @class */ (function () {
    function SlashCommand() {
        _SlashCommand_builder.set(this, new discord_js_1.SlashCommandSubcommandBuilder());
        _SlashCommand_options.set(this, {});
        _SlashCommand_handler.set(this, void 0);
        _SlashCommand_autocomplete.set(this, void 0);
    }
    SlashCommand.prototype.setDescription = function (description) {
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").setDescription(description);
        return this;
    };
    SlashCommand.prototype.addAttachment = function (name, input) {
        var option = input(new attachmentOptionBuilder_1.AttachmentOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addAttachmentOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addChannel = function (name, input) {
        var option = input(new channelOptionBuilder_1.ChannelOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addChannelOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addString = function (name, input) {
        var option = input(new stringOptionBuilder_1.StringOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addStringOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addNumber = function (name, input) {
        var option = input(new numberOptionBuilder_1.NumberOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addNumberOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addInteger = function (name, input) {
        var option = input(new integerOptionBuilder_1.IntegerOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addIntegerOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addUser = function (name, input) {
        var option = input(new userOptionBuilder_1.UserOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addUserOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addRole = function (name, input) {
        var option = input(new roleOptionBuilder_1.RoleOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addRoleOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.addBoolean = function (name, input) {
        var option = input(new booleanOptionBuilder_1.BooleanOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _SlashCommand_builder, "f").addBooleanOption(builder);
        __classPrivateFieldGet(this, _SlashCommand_options, "f")[name] = option;
        return this;
    };
    SlashCommand.prototype.toSlashCommandBuilder = function () {
        return __classPrivateFieldGet(this, _SlashCommand_builder, "f");
    };
    SlashCommand.prototype.toHandler = function () {
        return __classPrivateFieldGet(this, _SlashCommand_handler, "f");
    };
    SlashCommand.prototype.options = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var options;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = {};
                        return [4 /*yield*/, Promise.all(Object.entries(__classPrivateFieldGet(this, _SlashCommand_options, "f")).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                                var _c, _d;
                                var name = _b[0], optionBuilder = _b[1];
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _c = options;
                                            _d = name;
                                            return [4 /*yield*/, optionBuilder.transform(interaction, name)];
                                        case 1:
                                            _c[_d] = _e.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, options];
                }
            });
        });
    };
    SlashCommand.prototype.handle = function (handler) {
        var _this = this;
        // TODO: These handlers could be more efficient if we modified the
        // source code. This is how Elysia handles such cases.
        var _handler = function (ctx, interaction) { return __awaiter(_this, void 0, void 0, function () { var _a, _b; return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = handler;
                    _b = [ctx];
                    return [4 /*yield*/, this.options(interaction)];
                case 1: return [4 /*yield*/, _a.apply(void 0, _b.concat([_c.sent(), interaction]))];
                case 2: return [2 /*return*/, _c.sent()];
            }
        }); }); };
        __classPrivateFieldSet(this, _SlashCommand_handler, _handler, "f");
        return this;
    };
    SlashCommand.prototype.autocomplete = function (handler) {
        var _this = this;
        var _handler = function (ctx, interaction) { return __awaiter(_this, void 0, void 0, function () { var _a, _b; return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = handler;
                    _b = [ctx];
                    return [4 /*yield*/, this.options(interaction)];
                case 1: return [4 /*yield*/, _a.apply(void 0, _b.concat([_c.sent(), interaction]))];
                case 2: return [2 /*return*/, _c.sent()];
            }
        }); }); };
        __classPrivateFieldSet(this, _SlashCommand_autocomplete, _handler, "f");
        return this;
    };
    SlashCommand.prototype.toAutocomplete = function () {
        return __classPrivateFieldGet(this, _SlashCommand_autocomplete, "f");
    };
    return SlashCommand;
}());
exports.SlashCommand = SlashCommand;
_SlashCommand_builder = new WeakMap(), _SlashCommand_options = new WeakMap(), _SlashCommand_handler = new WeakMap(), _SlashCommand_autocomplete = new WeakMap();
var topLevelSlashCommand_1 = require("./topLevelSlashCommand");
Object.defineProperty(exports, "TopLevelSlashCommand", { enumerable: true, get: function () { return topLevelSlashCommand_1.TopLevelSlashCommand; } });
