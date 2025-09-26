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
exports.roles = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var fetchMembers_1 = require("./util/fetchMembers");
var modifyMembers_1 = require("./util/modifyMembers");
var parseUsers_1 = require("./util/parseUsers");
exports.roles = new core_1.Hashira({ name: "roles" }).use(base_1.base).group("rola", function (group) {
    return group
        .setDescription("Zarządzaj rolami użytkowników")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
        .setDMPermission(false)
        .addCommand("dodaj", function (command) {
        return command
            .setDescription("Dodaj rolę")
            .addRole("role", function (role) { return role.setDescription("Rola do dodania"); })
            .addString("users", function (users) {
            return users.setDescription("Użytkownicy do dodania roli (oddzielone spacjami)");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var members, toAdd, results, added;
            var log = _c.roleLog;
            var role = _d.role, users = _d.users;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(users))];
                    case 2:
                        members = _e.sent();
                        toAdd = members.filter(function (m) { return !m.roles.cache.has(role.id); });
                        return [4 /*yield*/, itx.editReply("Dodaj\u0119 rol\u0119 ".concat((0, discord_js_1.bold)(toAdd.size.toString()), " u\u017Cytkownikom...."))];
                    case 3:
                        _e.sent();
                        log.push("guildMemberBulkRoleAdd", itx.guild, {
                            moderator: itx.member,
                            role: role,
                            members: toAdd.map(function (m) { return m; }),
                        });
                        return [4 /*yield*/, (0, modifyMembers_1.modifyMembers)(toAdd, function (m) {
                                return m.roles.add(role, "Dodano rol\u0119 przez ".concat(itx.user.tag, " (").concat(itx.user.id, ")"));
                            })];
                    case 4:
                        results = _e.sent();
                        added = results.filter(function (r) { return r; }).length;
                        return [4 /*yield*/, itx.editReply("Dodano rol\u0119 ".concat((0, discord_js_1.roleMention)(role.id), " ").concat((0, discord_js_1.bold)(added.toString()), " u\u017Cytkownikom. ").concat((0, discord_js_1.bold)((members.size - toAdd.size).toString()), " u\u017Cytkownik\u00F3w mia\u0142o ju\u017C rol\u0119. ").concat((0, discord_js_1.bold)((toAdd.size - added).toString()), " u\u017Cytkownik\u00F3w ma za wysokie permisje."))];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("zabierz", function (command) {
        return command
            .setDescription("Zabierz rolę")
            .addRole("role", function (role) { return role.setDescription("Rola do zabrania"); })
            .addString("users", function (users) {
            return users.setDescription("Użytkownicy do dodania roli (oddzielone spacjami)");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var members, toRemove, results, removed;
            var log = _c.roleLog;
            var role = _d.role, users = _d.users;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply({ flags: "Ephemeral" })];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(users))];
                    case 2:
                        members = _e.sent();
                        toRemove = members.filter(function (m) { return m.roles.cache.has(role.id); });
                        return [4 /*yield*/, itx.editReply("Zabieram rol\u0119 ".concat((0, discord_js_1.bold)(toRemove.size.toString()), " u\u017Cytkownikom...."))];
                    case 3:
                        _e.sent();
                        log.push("guildMemberBulkRoleRemove", itx.guild, {
                            moderator: itx.member,
                            role: role,
                            members: toRemove.map(function (m) { return m; }),
                        });
                        return [4 /*yield*/, (0, modifyMembers_1.modifyMembers)(toRemove, function (m) {
                                return m.roles.remove(role, "Usuni\u0119to rol\u0119 przez ".concat(itx.user.tag, " (").concat(itx.user.id, ")"));
                            })];
                    case 4:
                        results = _e.sent();
                        removed = results.filter(function (r) { return r; }).length;
                        return [4 /*yield*/, itx.editReply("Zabrano rol\u0119 ".concat((0, discord_js_1.roleMention)(role.id), " ").concat((0, discord_js_1.bold)(removed.toString()), " u\u017Cytkownikom. ").concat((0, discord_js_1.bold)((members.size - toRemove.size).toString()), " u\u017Cytkownik\u00F3w nie mia\u0142o ju\u017C roli. ").concat((0, discord_js_1.bold)((toRemove.size - removed).toString()), " u\u017Cytkownik\u00F3w ma za wysokie permisje."))];
                    case 5:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
