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
exports.avatar = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
exports.avatar = new core_1.Hashira({ name: "avatar" }).command("avatar", function (command) {
    return command
        .setDescription("Wyświetl avatar użytkownika")
        .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
        .addInteger("size", function (size) {
        var _a;
        return (_a = size
            .setDescription("Rozmiar obrazu")
            .setRequired(false))
            .addChoices.apply(_a, discord_js_1.ALLOWED_SIZES.map(function (size) { return ({
            name: size.toString(),
            value: size,
        }); }));
    })
        .addString("format", function (format) {
        var _a;
        return (_a = format
            .setDescription("Format obrazu")
            .setRequired(false))
            .addChoices.apply(_a, discord_js_1.ALLOWED_EXTENSIONS.map(function (ext) { return ({
            name: ext,
            value: ext,
        }); }));
    })
        .addBoolean("guild-avatar", function (guildAvatar) {
        return guildAvatar
            .setDescription("Pobierz serwerowy avatar zamiast globalnego")
            .setRequired(false);
    })
        .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
        var size, extension, avatarUrl, member, embed;
        var _c;
        var user = _b.user, rawSize = _b.size, rawExtension = _b.format, guildAvatar = _b["guild-avatar"];
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _d.sent();
                    size = (_c = rawSize) !== null && _c !== void 0 ? _c : 1024;
                    extension = rawExtension;
                    if (!(guildAvatar && itx.inCachedGuild())) return [3 /*break*/, 3];
                    return [4 /*yield*/, itx.guild.members.fetch(user.id)];
                case 2:
                    member = _d.sent();
                    avatarUrl = member.displayAvatarURL(__assign({ size: size }, (extension ? { extension: extension } : {})));
                    return [3 /*break*/, 4];
                case 3:
                    avatarUrl = user.displayAvatarURL(__assign({ size: size }, (extension ? { extension: extension } : {})));
                    _d.label = 4;
                case 4:
                    embed = new discord_js_1.EmbedBuilder()
                        .setTitle("Avatar ".concat(user.tag))
                        .setImage(avatarUrl);
                    return [4 /*yield*/, itx.editReply({ embeds: [embed] })];
                case 5:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
