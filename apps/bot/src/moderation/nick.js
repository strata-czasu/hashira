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
exports.nick = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var errorFollowUp_1 = require("../util/errorFollowUp");
var sendDirectMessage_1 = require("../util/sendDirectMessage");
var NICK_RESET_DM_TEMPLATE = "\nTw\u00F3j pseudonim na Stracie Czasu zosta\u0142 zresetowany, poniewa\u017C nie da\u0142o si\u0119 go spingowa\u0107 wpisuj\u0105c pierwsze kilka liter pseudonimu w pasek wysy\u0142ania wiadomo\u015Bci na Discordzie.\n\nNapisz do osoby, kt\u00F3ra zresetowa\u0142a Ci nick ({{moderator}}), jego now\u0105 pingowaln\u0105 wersj\u0119 lub zdob\u0105d\u017A 5 poziom, \u017Ceby m\u00F3c samodzielnie zmieni\u0107 sw\u00F3j pseudonim.\n";
function formatNickResetDmContent(moderator) {
    return NICK_RESET_DM_TEMPLATE.replace("{{moderator}}", "".concat(moderator, " (").concat(moderator.tag, ")"));
}
exports.nick = new core_1.Hashira({ name: "nick" }).group("nick", function (group) {
    return group
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageNicknames)
        .setDescription("Zarządzaj nickami użytkowników")
        .addCommand("ustaw", function (command) {
        return command
            .setDescription("Ustaw nick użytkownika")
            .addUser("user", function (user) {
            return user.setDescription("Użytkownik, którego nick chcesz ustawić");
        })
            .addString("nick", function (nick) { return nick.setDescription("Nowy nick użytkownika"); })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var member;
            var user = _b.user, nick = _b.nick;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _c.sent();
                        member = itx.guild.members.cache.get(user.id);
                        if (!!member) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Użytkownika nie ma na serwerze.")];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3:
                        if (!(nick.length < 1 || nick.length > 32)) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nick musi mieć od 1 do 32 znaków.")];
                    case 4: return [2 /*return*/, _c.sent()];
                    case 5: return [4 /*yield*/, member.setNickname(nick, "Ustawienie nicku (moderator: ".concat(itx.user.tag, " (").concat(itx.user.id, "))"))];
                    case 6:
                        _c.sent();
                        return [4 /*yield*/, itx.editReply("Ustawiono nick u\u017Cytkownika ".concat(user.tag, " na ").concat((0, discord_js_1.inlineCode)(nick), "."))];
                    case 7:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("reset", function (command) {
        return command
            .setDescription("Zresetuj nick użytkownika")
            .addUser("user", function (user) {
            return user.setDescription("Użytkownik do zresetowania nicku");
        })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var member, response, dmContent, sentDm;
            var user = _b.user;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _c.sent();
                        member = itx.guild.members.cache.get(user.id);
                        if (!!member) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Użytkownika nie ma na serwerze.")];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3: return [4 /*yield*/, member.setNickname(null, "Reset nicku (moderator: ".concat(itx.user.tag, " (").concat(itx.user.id, "))"))];
                    case 4:
                        _c.sent();
                        response = ["Zresetowano nick u\u017Cytkownika ".concat(user.tag, ".")];
                        return [4 /*yield*/, user.createDM()];
                    case 5:
                        _c.sent();
                        dmContent = formatNickResetDmContent(itx.user);
                        return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(user, dmContent)];
                    case 6:
                        sentDm = _c.sent();
                        if (!sentDm) {
                            response.push("Nie udało się wysłać prywatnej wiadomości do użytkownika.");
                        }
                        return [4 /*yield*/, itx.editReply(response.join("\n"))];
                    case 7:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
