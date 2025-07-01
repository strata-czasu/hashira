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
exports.discordEventLogging = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var isAuditLogsEntryAction = function (entry, action) { return entry.action === action; };
var warnMissingAuditLogEntryTarget = function (entry) {
    // NOTE: While unlikely, the `target` property is marked as null
    console.warn("Possible audit log issue: action_type: ".concat(entry.action, " without target"), entry);
};
// Logging for Discord events
exports.discordEventLogging = new core_1.Hashira({ name: "discordEventLogging" })
    .use(base_1.base)
    .handle("messageDelete", function (_a, message_1) { return __awaiter(void 0, [_a, message_1], void 0, function (_b, message) {
    var _c;
    var log = _b.messageLog;
    return __generator(this, function (_d) {
        if (!message.inGuild())
            return [2 /*return*/];
        if (!log.isRegistered(message.guild))
            return [2 /*return*/];
        // NOTE: Deleting an uncached message can still trigger this event with unexpected
        //       null values leading to a TypeError evaluating `message.author.bot`
        if ((_c = message === null || message === void 0 ? void 0 : message.author) === null || _c === void 0 ? void 0 : _c.bot)
            return [2 /*return*/];
        log.push("messageDelete", message.guild, { message: message });
        return [2 /*return*/];
    });
}); })
    .handle("messageUpdate", function (_a, oldMessage_1, newMessage_1) { return __awaiter(void 0, [_a, oldMessage_1, newMessage_1], void 0, function (_b, oldMessage, newMessage) {
    var log = _b.messageLog;
    return __generator(this, function (_c) {
        if (!oldMessage.inGuild() || !newMessage.inGuild())
            return [2 /*return*/];
        if (!log.isRegistered(oldMessage.guild) || !log.isRegistered(newMessage.guild))
            return [2 /*return*/];
        if (oldMessage.author.bot || newMessage.author.bot)
            return [2 /*return*/];
        log.push("messageUpdate", newMessage.guild, {
            oldMessage: oldMessage,
            newMessage: newMessage,
            oldMessageContent: oldMessage.content,
            newMessageContent: newMessage.content,
        });
        return [2 /*return*/];
    });
}); })
    .handle("guildMemberAdd", function (_a, member_1) { return __awaiter(void 0, [_a, member_1], void 0, function (_b, member) {
    var log = _b.memberLog;
    return __generator(this, function (_c) {
        if (!log.isRegistered(member.guild))
            return [2 /*return*/];
        log.push("guildMemberAdd", member.guild, { member: member });
        return [2 /*return*/];
    });
}); })
    .handle("guildMemberRemove", function (_a, member_1) { return __awaiter(void 0, [_a, member_1], void 0, function (_b, member) {
    var roles;
    var log = _b.memberLog;
    return __generator(this, function (_c) {
        // NOTE: We don't let partials through as events
        // FIXME: Support partial events
        if (!(member instanceof discord_js_1.GuildMember))
            return [2 /*return*/];
        if (!log.isRegistered(member.guild))
            return [2 /*return*/];
        roles = member.roles.cache
            .filter(function (r) { return r !== member.guild.roles.everyone; })
            .map(function (r) { return r; });
        log.push("guildMemberRemove", member.guild, { member: member, roles: roles });
        return [2 /*return*/];
    });
}); })
    .handle("guildMemberUpdate", function (_a, oldMember_1, newMember_1) { return __awaiter(void 0, [_a, oldMember_1, newMember_1], void 0, function (_b, oldMember, newMember) {
    var log = _b.profileLog;
    return __generator(this, function (_c) {
        if (!log.isRegistered(newMember.guild))
            return [2 /*return*/];
        if (oldMember.nickname !== newMember.nickname) {
            log.push("guildMemberNicknameUpdate", newMember.guild, {
                member: newMember,
                oldNickname: oldMember.nickname,
                newNickname: newMember.nickname,
            });
        }
        return [2 /*return*/];
    });
}); })
    .handle("guildMemberUpdate", function (_a, oldMember_1, newMember_1) { return __awaiter(void 0, [_a, oldMember_1, newMember_1], void 0, function (_b, oldMember, newMember) {
    var removedRoles, addedRoles;
    var log = _b.roleLog;
    return __generator(this, function (_c) {
        if (!log.isRegistered(newMember.guild))
            return [2 /*return*/];
        if (oldMember.roles.cache.size > newMember.roles.cache.size) {
            removedRoles = oldMember.roles.cache
                .filter(function (r) { return !newMember.roles.cache.has(r.id); })
                .map(function (r) { return r; });
            if (removedRoles.length > 0) {
                log.push("guildMemberRoleRemove", newMember.guild, {
                    member: newMember,
                    removedRoles: removedRoles,
                });
            }
        }
        else if (oldMember.roles.cache.size < newMember.roles.cache.size) {
            addedRoles = newMember.roles.cache
                .filter(function (r) { return !oldMember.roles.cache.has(r.id); })
                .map(function (r) { return r; });
            if (addedRoles.length > 0) {
                log.push("guildMemberRoleAdd", newMember.guild, {
                    member: newMember,
                    addedRoles: addedRoles,
                });
            }
        }
        return [2 /*return*/];
    });
}); })
    .handle("guildAuditLogEntryCreate", function (_a, entry_1, guild_1) { return __awaiter(void 0, [_a, entry_1, guild_1], void 0, function (_b, entry, guild) {
    var log = _b.moderationLog;
    return __generator(this, function (_c) {
        if (isAuditLogsEntryAction(entry, discord_js_1.AuditLogEvent.MemberBanAdd)) {
            if (!entry.target)
                return [2 /*return*/, warnMissingAuditLogEntryTarget(entry)];
            return [2 /*return*/, log.push("guildBanAdd", guild, {
                    reason: entry.reason,
                    user: entry.target,
                    moderator: entry.executor,
                })];
        }
        if (isAuditLogsEntryAction(entry, discord_js_1.AuditLogEvent.MemberBanRemove)) {
            if (!entry.target)
                return [2 /*return*/, warnMissingAuditLogEntryTarget(entry)];
            return [2 /*return*/, log.push("guildBanRemove", guild, {
                    reason: entry.reason,
                    user: entry.target,
                    moderator: entry.executor,
                })];
        }
        return [2 /*return*/];
    });
}); });
