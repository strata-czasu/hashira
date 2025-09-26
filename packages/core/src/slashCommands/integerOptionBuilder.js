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
var _IntegerOptionBuilder_builder;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegerOptionBuilder = void 0;
var discord_js_1 = require("discord.js");
var IntegerOptionBuilder = /** @class */ (function () {
    function IntegerOptionBuilder() {
        _IntegerOptionBuilder_builder.set(this, new discord_js_1.SlashCommandIntegerOption().setRequired(true));
    }
    IntegerOptionBuilder.prototype.setDescription = function (description) {
        __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f").setDescription(description);
        return this;
    };
    IntegerOptionBuilder.prototype.setRequired = function (required) {
        __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f").setRequired(required);
        return this;
    };
    IntegerOptionBuilder.prototype.setMinValue = function (min) {
        __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f").setMinValue(min);
        return this;
    };
    IntegerOptionBuilder.prototype.setMaxValue = function (max) {
        __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f").setMaxValue(max);
        return this;
    };
    IntegerOptionBuilder.prototype.setAutocomplete = function (autocomplete) {
        __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f").setAutocomplete(autocomplete);
        return this;
    };
    IntegerOptionBuilder.prototype.addChoices = function () {
        var _a;
        var choices = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            choices[_i] = arguments[_i];
        }
        (_a = __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f")).addChoices.apply(_a, choices);
        return this;
    };
    IntegerOptionBuilder.prototype.toSlashCommandOption = function () {
        return __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f");
    };
    IntegerOptionBuilder.prototype.transform = function (interaction, name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, interaction.options.getInteger(name, __classPrivateFieldGet(this, _IntegerOptionBuilder_builder, "f").required)];
            });
        });
    };
    return IntegerOptionBuilder;
}());
exports.IntegerOptionBuilder = IntegerOptionBuilder;
_IntegerOptionBuilder_builder = new WeakMap();
