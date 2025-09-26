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
exports.brochure = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var specializedConstants_1 = require("./specializedConstants");
var getGuildSetting_1 = require("./util/getGuildSetting");
var sendDirectMessage_1 = require("./util/sendDirectMessage");
var addedRole = function (oldMember, newMember, roleId) { return !oldMember.roles.cache.has(roleId) && newMember.roles.cache.has(roleId); };
var formatGenderChannelMessage = function (member, imageUrl) { return "## Hej ".concat((0, discord_js_1.userMention)(member.id), "!\nMamy nadziej\u0119, \u017Ce nigdy do tego nie dojdzie, ale je\u017Celi b\u0119dziesz kiedy\u015B \u015Bwiadkiem lub ofiar\u0105 jakiej\u015B nieprzyjemnej sytuacji opisanej na bannerze poni\u017Cej, to **zg\u0142o\u015B j\u0105 prosz\u0119 do nas poprzez ten formularz: <https://bit.ly/nieprzyjemne>**.\n\nNie tolerujemy takich obrzydliwych zachowa\u0144 na Stracie Czasu[.](").concat(imageUrl, ") Nie jeste\u015Bmy jednak w stanie monitorowa\u0107 ka\u017Cdego kana\u0142u tekstowego i g\u0142osowego na Stracie Czasu, a tym bardziej DM\u00F3w na kt\u00F3rych cz\u0119sto tego typu sytuacje maj\u0105 miejsce."); };
exports.brochure = new core_1.Hashira({ name: "brochure" }).handle("guildMemberUpdate", function (_, oldMember, newMember) { return __awaiter(void 0, void 0, void 0, function () {
    var brochureRoles, message, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                brochureRoles = (0, getGuildSetting_1.getGuildSetting)(specializedConstants_1.BROCHURE_ROLES, newMember.guild.id);
                if (!brochureRoles)
                    return [2 /*return*/];
                if (!addedRole(oldMember, newMember, brochureRoles.FEMALE)) return [3 /*break*/, 2];
                message = formatGenderChannelMessage(newMember, "https://i.imgur.com/qETLkML.png");
                return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(newMember.user, message)];
            case 1:
                _a.sent();
                return [2 /*return*/];
            case 2:
                if (!addedRole(oldMember, newMember, brochureRoles.MALE)) return [3 /*break*/, 4];
                message = formatGenderChannelMessage(newMember, "https://i.imgur.com/h97Vub1.png");
                return [4 /*yield*/, (0, sendDirectMessage_1.sendDirectMessage)(newMember.user, message)];
            case 3:
                _a.sent();
                return [2 /*return*/];
            case 4: return [2 /*return*/];
        }
    });
}); });
