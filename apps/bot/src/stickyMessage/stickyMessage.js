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
exports.stickyMessage = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var discordTry_1 = require("../util/discordTry");
var embedBuilder_1 = require("../util/embedBuilder");
var errorFollowUp_1 = require("../util/errorFollowUp");
var getShortenedUrl_1 = require("../util/getShortenedUrl");
exports.stickyMessage = new core_1.Hashira({ name: "sticky-message" })
    .use(base_1.base)
    .group("sticky-message", function (group) {
    return group
        .setDescription("Commands related to sticky messages")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addCommand("set", function (command) {
        return command
            .setDescription("Set a sticky message")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("The channel to set the sticky message in")
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .addString("dataurl", function (attachment) {
            return attachment.setDescription("Data URL of the message to set");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var url, data, json, exists, message;
            var prisma = _c.prisma, stickyMessageCache = _c.stickyMessageCache;
            var channel = _d.channel, dataurl = _d.dataurl;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        url = new URL(dataurl);
                        data = url.searchParams.get("data");
                        if (!data)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Invalid data URL")];
                        json = (0, embedBuilder_1.decodeJson)(data);
                        if (!json)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Invalid JSON")];
                        return [4 /*yield*/, prisma.stickyMessage.findFirst({
                                where: { channelId: channel.id },
                            })];
                    case 1:
                        exists = _e.sent();
                        if (!exists) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return channel.messages.delete(exists.lastMessageId); }, [discord_js_1.RESTJSONErrorCodes.UnknownMessage], es_toolkit_1.noop)];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3: return [4 /*yield*/, channel.send(json)];
                    case 4:
                        message = _e.sent();
                        return [4 /*yield*/, prisma.stickyMessage.upsert({
                                where: { channelId: channel.id },
                                create: {
                                    channelId: channel.id,
                                    guildId: itx.guildId,
                                    enabled: true,
                                    lastMessageId: message.id,
                                    content: json,
                                },
                                update: {
                                    content: json,
                                    lastMessageId: message.id,
                                },
                            })];
                    case 5:
                        _e.sent();
                        stickyMessageCache.invalidate(channel.id);
                        return [4 /*yield*/, itx.reply("Sticky message set in ".concat(channel))];
                    case 6:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("edit-url", function (command) {
        return command
            .setDescription("Get the data URL of a message for editing")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("The channel to get the data URL from")
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var stickyMessage, content, shortenedUrl;
            var prisma = _c.prisma;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.stickyMessage.findFirst({
                                where: { channelId: channel.id },
                            })];
                    case 1:
                        stickyMessage = _e.sent();
                        if (!stickyMessage)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "No sticky message found")];
                        content = (0, embedBuilder_1.encodeJson)(stickyMessage.content);
                        return [4 /*yield*/, (0, getShortenedUrl_1.getShortenedUrl)(content)];
                    case 2:
                        shortenedUrl = _e.sent();
                        return [4 /*yield*/, itx.reply({ content: shortenedUrl.shortUrl })];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("toggle", function (command) {
        return command
            .setDescription("Toggle a sticky message")
            .addChannel("channel", function (channel) {
            return channel
                .setDescription("The channel to toggle the sticky message in")
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var exists;
            var prisma = _c.prisma, stickyMessageCache = _c.stickyMessageCache;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, prisma.stickyMessage.findFirst({
                                where: { channelId: channel.id },
                            })];
                    case 1:
                        exists = _e.sent();
                        if (!exists)
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "No sticky message found")];
                        return [4 /*yield*/, prisma.stickyMessage.update({
                                where: { channelId: channel.id },
                                data: { enabled: !exists.enabled },
                            })];
                    case 2:
                        _e.sent();
                        stickyMessageCache.invalidate(channel.id);
                        return [4 /*yield*/, itx.reply("".concat((0, discord_js_1.channelMention)(channel.id), ": ").concat(exists.enabled ? "disabled" : "enabled"))];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("list", function (command) {
        return command
            .setDescription("List all sticky messages")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var paginator, paginate;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        paginator = new db_1.DatabasePaginator(function (props) {
                            return prisma.stickyMessage.findMany(__assign(__assign({}, props), { where: { guildId: itx.guildId } }));
                        }, function () { return prisma.stickyMessage.count({ where: { guildId: itx.guildId } }); });
                        paginate = new core_1.PaginatedView(paginator, "sticky messages", function (stickyMessage) {
                            var mention = (0, discord_js_1.channelMention)(stickyMessage.channelId);
                            var link = (0, discord_js_1.messageLink)(stickyMessage.channelId, stickyMessage.lastMessageId, stickyMessage.guildId);
                            var enabled = stickyMessage.enabled ? "enabled" : "disabled";
                            var cached = stickyMessage.enabled ? "cached" : "not cached";
                            return "".concat(mention, ": ").concat(link, " - ").concat(enabled, " (").concat(cached, ")");
                        });
                        return [4 /*yield*/, paginate.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("refresh", function (command) {
        return command
            .setDescription("Refresh a sticky message cache for a channel")
            .addChannel("channel", function (channel) {
            return channel.setDescription("The channel to refresh the sticky message in");
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var stickyMessageCache = _c.stickyMessageCache;
            var channel = _d.channel;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        stickyMessageCache.invalidate(channel.id);
                        return [4 /*yield*/, itx.reply("Refreshed sticky message in ".concat(channel))];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
