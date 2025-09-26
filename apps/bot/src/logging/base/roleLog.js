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
exports.roleLog = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var logger_1 = require("./logger");
var util_1 = require("./util");
var formatRole = function (role) { return "".concat((0, discord_js_1.roleMention)(role.id), " (").concat(role.name, ")"); };
exports.roleLog = new core_1.Hashira({ name: "roleLog" }).const("roleLog", new logger_1.Logger()
    .addMessageType("guildMemberRoleAdd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var embed, addedRole;
    var timestamp = _c.timestamp;
    var member = _d.member, addedRoles = _d.addedRoles;
    return __generator(this, function (_e) {
        embed = (0, util_1.getLogMessageEmbed)(member, timestamp).setColor("Green");
        if (addedRoles.length === 1) {
            addedRole = addedRoles[0];
            embed.setDescription("**Otrzymuje rol\u0119** ".concat(formatRole(addedRole)));
        }
        else {
            embed.setDescription("**Otrzymuje role** \n".concat(addedRoles.map(formatRole).join(", ")));
        }
        return [2 /*return*/, embed];
    });
}); })
    .addMessageType("guildMemberRoleRemove", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var embed, removedRole;
    var timestamp = _c.timestamp;
    var member = _d.member, removedRoles = _d.removedRoles;
    return __generator(this, function (_e) {
        embed = (0, util_1.getLogMessageEmbed)(member, timestamp).setColor("Red");
        if (removedRoles.length === 1) {
            removedRole = removedRoles[0];
            embed.setDescription("**Traci rol\u0119** ".concat(formatRole(removedRole)));
        }
        else {
            embed.setDescription("**Traci role** \n".concat(removedRoles.map(formatRole).join(", ")));
        }
        return [2 /*return*/, embed];
    });
}); })
    .addMessageType("guildMemberBulkRoleAdd", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var embed, lines;
    var timestamp = _c.timestamp;
    var moderator = _d.moderator, members = _d.members, role = _d.role;
    return __generator(this, function (_e) {
        embed = (0, util_1.getLogMessageEmbed)(moderator, timestamp).setColor("Green");
        lines = [
            "**Dodaje rol\u0119 ".concat(formatRole(role), " ").concat(members.length, " u\u017Cytkownikom**:"),
            members.map(function (m) { return m.user.tag; }).join(", "),
        ];
        embed.setDescription(lines.join("\n"));
        return [2 /*return*/, embed];
    });
}); })
    .addMessageType("guildMemberBulkRoleRemove", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var embed, lines;
    var timestamp = _c.timestamp;
    var moderator = _d.moderator, members = _d.members, role = _d.role;
    return __generator(this, function (_e) {
        embed = (0, util_1.getLogMessageEmbed)(moderator, timestamp).setColor("Red");
        lines = [
            "**Zabiera rol\u0119 ".concat(formatRole(role), " ").concat(members.length, " u\u017Cytkownikom**:"),
            members.map(function (m) { return m.user.tag; }).join(", "),
        ];
        embed.setDescription(lines.join("\n"));
        return [2 /*return*/, embed];
    });
}); }));
