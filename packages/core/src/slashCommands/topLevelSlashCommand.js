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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _TopLevelSlashCommand_builder, _TopLevelSlashCommand_options, _TopLevelSlashCommand_handler, _TopLevelSlashCommand_autocomplete;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopLevelSlashCommand = void 0;
var discord_js_1 = require("discord.js");
var attachmentOptionBuilder_1 = require("./attachmentOptionBuilder");
var booleanOptionBuilder_1 = require("./booleanOptionBuilder");
var integerOptionBuilder_1 = require("./integerOptionBuilder");
var numberOptionBuilder_1 = require("./numberOptionBuilder");
var roleOptionBuilder_1 = require("./roleOptionBuilder");
var stringOptionBuilder_1 = require("./stringOptionBuilder");
var userOptionBuilder_1 = require("./userOptionBuilder");
// TODO: This is a giant mess, it should be merged with normal SlashCommand but currently it's too fragile
var TopLevelSlashCommand = /** @class */ (function () {
    function TopLevelSlashCommand() {
        _TopLevelSlashCommand_builder.set(this, new discord_js_1.SlashCommandBuilder());
        _TopLevelSlashCommand_options.set(this, {});
        _TopLevelSlashCommand_handler.set(this, void 0);
        _TopLevelSlashCommand_autocomplete.set(this, void 0);
    }
    TopLevelSlashCommand.prototype.setDescription = function (description) {
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").setDescription(description);
        return this;
    };
    TopLevelSlashCommand.prototype.setDefaultMemberPermissions = function (permission) {
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").setDefaultMemberPermissions(permission);
        return this;
    };
    TopLevelSlashCommand.prototype.setDMPermission = function (enabled) {
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").setDMPermission(enabled);
        return this;
    };
    TopLevelSlashCommand.prototype.addAttachment = function (name, input) {
        var option = input(new attachmentOptionBuilder_1.AttachmentOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addAttachmentOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.addString = function (name, input) {
        var option = input(new stringOptionBuilder_1.StringOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addStringOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.addNumber = function (name, input) {
        var option = input(new numberOptionBuilder_1.NumberOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addNumberOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.addInteger = function (name, input) {
        var option = input(new integerOptionBuilder_1.IntegerOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addIntegerOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.addUser = function (name, input) {
        var option = input(new userOptionBuilder_1.UserOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addUserOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.addRole = function (name, input) {
        var option = input(new roleOptionBuilder_1.RoleOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addRoleOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.addBoolean = function (name, input) {
        var option = input(new booleanOptionBuilder_1.BooleanOptionBuilder());
        var builder = option.toSlashCommandOption().setName(name);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f").addBooleanOption(builder);
        __classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")[name] = option;
        return this;
    };
    TopLevelSlashCommand.prototype.toSlashCommandBuilder = function () {
        return __classPrivateFieldGet(this, _TopLevelSlashCommand_builder, "f");
    };
    TopLevelSlashCommand.prototype.toHandler = function () {
        return __classPrivateFieldGet(this, _TopLevelSlashCommand_handler, "f");
    };
    TopLevelSlashCommand.prototype.options = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var options;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = {};
                        return [4 /*yield*/, Promise.all(Object.entries(__classPrivateFieldGet(this, _TopLevelSlashCommand_options, "f")).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
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
    TopLevelSlashCommand.prototype.handle = function (handler) {
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
        __classPrivateFieldSet(this, _TopLevelSlashCommand_handler, _handler, "f");
        return this;
    };
    TopLevelSlashCommand.prototype.autocomplete = function (handler) {
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
        __classPrivateFieldSet(this, _TopLevelSlashCommand_autocomplete, _handler, "f");
        return this;
    };
    TopLevelSlashCommand.prototype.toAutocomplete = function () {
        return __classPrivateFieldGet(this, _TopLevelSlashCommand_autocomplete, "f");
    };
    return TopLevelSlashCommand;
}());
exports.TopLevelSlashCommand = TopLevelSlashCommand;
_TopLevelSlashCommand_builder = new WeakMap(), _TopLevelSlashCommand_options = new WeakMap(), _TopLevelSlashCommand_handler = new WeakMap(), _TopLevelSlashCommand_autocomplete = new WeakMap();
