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
exports.settings = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var formatRoleSetting = function (name, roleId) {
    return "".concat(name, ": ").concat(roleId ? (0, discord_js_1.roleMention)(roleId) : "Nie ustawiono");
};
var formatLogSettings = function (settings) {
    if (!settings)
        return "Logi: Nie ustawiono żadnych kanałów";
    return [
        formatChannelSetting("Kanał do logów (wiadomości)", settings.messageLogChannelId),
        formatChannelSetting("Kanał do logów (użytkownicy)", settings.memberLogChannelId),
        formatChannelSetting("Kanał do logów (role)", settings.roleLogChannelId),
        formatChannelSetting("Kanał do logów (moderacja)", settings.moderationLogChannelId),
        formatChannelSetting("Kanał do logów (profile)", settings.profileLogChannelId),
        formatChannelSetting("Kanał do logów (ekonomia)", settings.economyLogChannelId),
    ].join("\n");
};
var formatChannelSetting = function (name, channelId) {
    return "".concat(name, ": ").concat(channelId ? (0, discord_js_1.channelMention)(channelId) : "Nie ustawiono");
};
exports.settings = new core_1.Hashira({ name: "settings" })
    .use(base_1.base)
    .group("settings", function (group) {
    return group
        .setDescription("Zarządzaj ustawieniami serwera")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addCommand("mute-role", function (command) {
        return command
            .setDescription("Ustaw rolę do wyciszeń")
            .addRole("role", function (role) {
            return role.setDescription("Rola, która ma być nadawana wyciszonym użytkownikom");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma;
            var role = _d.role;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                where: { guildId: itx.guildId },
                                data: { muteRoleId: role.id },
                            })];
                    case 1:
                        _e.sent();
                        // TODO: Update the role on currently muted users
                        return [4 /*yield*/, itx.reply({
                                content: "Rola do wycisze\u0144 zosta\u0142a ustawiona na ".concat((0, discord_js_1.roleMention)(role.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        // TODO: Update the role on currently muted users
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("18-plus-role", function (command) {
        return command
            .setDescription("Ustaw rolę 18+")
            .addRole("role", function (role) {
            return role.setDescription("Rola, która ma być nadawana po weryfikacji 18+");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma;
            var role = _d.role;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                where: { guildId: itx.guildId },
                                data: { plus18RoleId: role.id },
                            })];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, itx.reply({
                                content: "Rola 18+ zosta\u0142a ustawiona na ".concat((0, discord_js_1.roleMention)(role.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("message-log-channel", function (command) {
        return command
            .setDescription("Ustaw kanał do wysyłania logów związanych z wiadomościami")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("Kanał, na który mają być wysyłane logi")
                .setChannelType(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.PrivateThread, discord_js_1.ChannelType.PublicThread);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.messageLog;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                data: {
                                    logSettings: {
                                        upsert: {
                                            create: { messageLogChannelId: channel.id },
                                            update: { messageLogChannelId: channel.id },
                                        },
                                    },
                                },
                                where: { guildId: itx.guildId },
                            })];
                    case 1:
                        _e.sent();
                        log.updateGuild(itx.guild, channel);
                        return [4 /*yield*/, itx.reply({
                                content: "Kana\u0142 do wysy\u0142ania log\u00F3w zwi\u0105zanych z wiadomo\u015Bciami zosta\u0142 ustawiony na ".concat((0, discord_js_1.channelMention)(channel.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("member-log-channel", function (command) {
        return command
            .setDescription("Ustaw kanał do wysyłania logów związanych z użytkownikami")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("Kanał, na który mają być wysyłane logi")
                .setChannelType(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.PrivateThread, discord_js_1.ChannelType.PublicThread);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.memberLog;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                data: {
                                    logSettings: {
                                        upsert: {
                                            create: { memberLogChannelId: channel.id },
                                            update: { memberLogChannelId: channel.id },
                                        },
                                    },
                                },
                                where: { guildId: itx.guildId },
                            })];
                    case 1:
                        _e.sent();
                        log.updateGuild(itx.guild, channel);
                        return [4 /*yield*/, itx.reply({
                                content: "Kana\u0142 do wysy\u0142ania log\u00F3w zwi\u0105zanych z u\u017Cytkownikami zosta\u0142 ustawiony na ".concat((0, discord_js_1.channelMention)(channel.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("role-log-channel", function (command) {
        return command
            .setDescription("Ustaw kanał do wysyłania logów związanych z rolami")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("Kanał, na który mają być wysyłane logi")
                .setChannelType(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.PrivateThread, discord_js_1.ChannelType.PublicThread);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.roleLog;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                data: {
                                    logSettings: {
                                        upsert: {
                                            create: { roleLogChannelId: channel.id },
                                            update: { roleLogChannelId: channel.id },
                                        },
                                    },
                                },
                                where: { guildId: itx.guildId },
                            })];
                    case 1:
                        _e.sent();
                        log.updateGuild(itx.guild, channel);
                        return [4 /*yield*/, itx.reply({
                                content: "Kana\u0142 do wysy\u0142ania log\u00F3w zwi\u0105zanych z rolami zosta\u0142 ustawiony na ".concat((0, discord_js_1.channelMention)(channel.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("moderation-log-channel", function (command) {
        return command
            .setDescription("Ustaw kanał do wysyłania logów związanych z mutami, warnami i banami")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("Kanał, na który mają być wysyłane logi")
                .setChannelType(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.PrivateThread, discord_js_1.ChannelType.PublicThread);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.moderationLog;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                data: {
                                    logSettings: {
                                        upsert: {
                                            create: { moderationLogChannelId: channel.id },
                                            update: { moderationLogChannelId: channel.id },
                                        },
                                    },
                                },
                                where: { guildId: itx.guildId },
                            })];
                    case 1:
                        _e.sent();
                        log.updateGuild(itx.guild, channel);
                        return [4 /*yield*/, itx.reply({
                                content: "Kana\u0142 do wysy\u0142ania log\u00F3w zwi\u0105zanych z banami zosta\u0142 ustawiony na ".concat((0, discord_js_1.channelMention)(channel.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("profile-log-channel", function (command) {
        return command
            .setDescription("Ustaw kanał do wysyłania logów związanych z profilami użytkowników")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("Kanał, na który mają być wysyłane logi")
                .setChannelType(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.PrivateThread, discord_js_1.ChannelType.PublicThread);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.profileLog;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                data: {
                                    logSettings: {
                                        upsert: {
                                            create: { profileLogChannelId: channel.id },
                                            update: { profileLogChannelId: channel.id },
                                        },
                                    },
                                },
                                where: { guildId: itx.guildId },
                            })];
                    case 1:
                        _e.sent();
                        log.updateGuild(itx.guild, channel);
                        return [4 /*yield*/, itx.reply({
                                content: "Kana\u0142 do wysy\u0142ania log\u00F3w zwi\u0105zanych z profilami u\u017Cytkownik\u00F3w zosta\u0142 ustawiony na ".concat((0, discord_js_1.channelMention)(channel.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("economy-log-channel", function (command) {
        return command
            .setDescription("Ustaw kanał do wysyłania logów związanych z ekonomią")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("Kanał, na który mają być wysyłane logi")
                .setChannelType(discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.PrivateThread, discord_js_1.ChannelType.PublicThread);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var prisma = _c.prisma, log = _c.economyLog;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.update({
                                data: {
                                    logSettings: {
                                        upsert: {
                                            create: { economyLogChannelId: channel.id },
                                            update: { economyLogChannelId: channel.id },
                                        },
                                    },
                                },
                                where: { guildId: itx.guildId },
                            })];
                    case 1:
                        _e.sent();
                        log.updateGuild(itx.guild, channel);
                        return [4 /*yield*/, itx.reply({
                                content: "Kana\u0142 do wysy\u0142ania log\u00F3w zwi\u0105zanych z ekonomi\u0105 zosta\u0142 ustawiony na ".concat((0, discord_js_1.channelMention)(channel.id)),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("list", function (command) {
        return command
            .setDescription("Wyświetl ustawienia serwera")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var settings, entries;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.guildSettings.findFirst({
                                where: { guildId: itx.guildId },
                                include: { logSettings: true },
                            })];
                    case 1:
                        settings = _c.sent();
                        if (!settings)
                            throw new Error("Guild settings not found");
                        entries = [
                            formatRoleSetting("Rola do wyciszeń", settings.muteRoleId),
                            formatRoleSetting("Rola 18+", settings.plus18RoleId),
                            formatLogSettings(settings.logSettings),
                        ];
                        return [4 /*yield*/, itx.reply({
                                content: entries.join("\n"),
                                flags: "Ephemeral",
                            })];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
