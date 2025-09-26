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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userTextActivity = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var discordTry_1 = require("../util/discordTry");
var errorFollowUp_1 = require("../util/errorFollowUp");
var fetchMessages_1 = require("../util/fetchMessages");
var isOwner_1 = require("../util/isOwner");
var handleStickyMessage = function (stickyMessageCache, message) { return __awaiter(void 0, void 0, void 0, function () {
    var stickyMessage, newMessage;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (message.author.id === ((_a = message.client.user) === null || _a === void 0 ? void 0 : _a.id))
                    return [2 /*return*/];
                return [4 /*yield*/, stickyMessageCache.get(message.channel.id)];
            case 1:
                stickyMessage = _b.sent();
                if (!stickyMessage)
                    return [2 /*return*/];
                (0, discordTry_1.discordTry)(function () { return message.channel.messages.delete(stickyMessage.lastMessageId); }, [discord_js_1.RESTJSONErrorCodes.UnknownMessage], es_toolkit_1.noop); // just ignore the error if cannot remove the message
                return [4 /*yield*/, message.channel.send(stickyMessage.content)];
            case 2:
                newMessage = _b.sent();
                return [4 /*yield*/, stickyMessageCache.update(message.channel.id, newMessage.id)];
            case 3:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.userTextActivity = new core_1.Hashira({ name: "user-text-activity" })
    .use(base_1.base)
    .group("user-activity", function (group) {
    return group
        .setDescription("User activity related commands")
        .addCommand("preload", function (cmd) {
        return cmd
            .setDescription("Preload user activity data")
            .addChannel("channel", function (option) {
            return option
                .setDescription("The channel to preload")
                .setRequired(false)
                .setChannelType(discord_js_1.ChannelType.GuildText);
        })
            .addNumber("limit", function (option) {
            return option
                .setDescription("The limit of messages to preload")
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100000);
        })
            .addString("before", function (option) {
            return option.setDescription("The id of message to start from").setRequired(false);
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var channel, before, limit, i, _e, _f, _g, messages, messageData, userData, e_1_1;
            var _h, e_1, _j, _k;
            var _l;
            var prisma = _c.prisma;
            var rawChannel = _d.channel, rawBefore = _d.before, rawLimit = _d.limit;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0: return [4 /*yield*/, (0, isOwner_1.isNotOwner)(itx.user)];
                    case 1:
                        if (_m.sent())
                            return [2 /*return*/];
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        channel = rawChannel !== null && rawChannel !== void 0 ? rawChannel : itx.channel;
                        if (!!channel) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Channel not found")];
                    case 2: return [2 /*return*/, _m.sent()];
                    case 3:
                        before = rawBefore !== null && rawBefore !== void 0 ? rawBefore : discord_js_1.SnowflakeUtil.generate({ timestamp: Date.now() }).toString();
                        limit = rawLimit !== null && rawLimit !== void 0 ? rawLimit : 1000;
                        return [4 /*yield*/, itx.reply({
                                content: "Preloading messages...",
                                flags: "Ephemeral",
                            })];
                    case 4:
                        _m.sent();
                        i = 0;
                        _m.label = 5;
                    case 5:
                        _m.trys.push([5, 12, 13, 18]);
                        _e = true, _f = __asyncValues((0, fetchMessages_1.fetchMessages)(channel, limit, before));
                        _m.label = 6;
                    case 6: return [4 /*yield*/, _f.next()];
                    case 7:
                        if (!(_g = _m.sent(), _h = _g.done, !_h)) return [3 /*break*/, 11];
                        _k = _g.value;
                        _e = false;
                        messages = _k;
                        messageData = messages.map(function (message) { return ({
                            userId: message.author.id,
                            guildId: message.guild.id,
                            messageId: message.id,
                            channelId: message.channel.id,
                            timestamp: message.createdAt,
                        }); });
                        userData = messageData.map(function (data) { return ({ id: data.userId }); });
                        i += messageData.length;
                        return [4 /*yield*/, itx.followUp({
                                content: "Preloaded ".concat(i, "/").concat(limit, " messages. It's ").concat((i / limit) * 100, "% done. Last message: ").concat((_l = messages.last()) === null || _l === void 0 ? void 0 : _l.url),
                                flags: "Ephemeral",
                            })];
                    case 8:
                        _m.sent();
                        return [4 /*yield*/, prisma.$transaction([
                                prisma.user.createMany({ data: userData, skipDuplicates: true }),
                                prisma.userTextActivity.createMany({ data: messageData }),
                            ])];
                    case 9:
                        _m.sent();
                        _m.label = 10;
                    case 10:
                        _e = true;
                        return [3 /*break*/, 6];
                    case 11: return [3 /*break*/, 18];
                    case 12:
                        e_1_1 = _m.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 18];
                    case 13:
                        _m.trys.push([13, , 16, 17]);
                        if (!(!_e && !_h && (_j = _f.return))) return [3 /*break*/, 15];
                        return [4 /*yield*/, _j.call(_f)];
                    case 14:
                        _m.sent();
                        _m.label = 15;
                    case 15: return [3 /*break*/, 17];
                    case 16:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 17: return [7 /*endfinally*/];
                    case 18: return [2 /*return*/];
                }
            });
        }); });
    });
})
    .handle("guildMessageCreate", function (_a, message_1) { return __awaiter(void 0, [_a, message_1], void 0, function (_b, message) {
    var stickyMessageCache = _b.stickyMessageCache, userTextActivityQueue = _b.userTextActivityQueue;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                userTextActivityQueue.push(message.channel.id, {
                    user: {
                        connectOrCreate: {
                            create: { id: message.author.id },
                            where: { id: message.author.id },
                        },
                    },
                    guild: { connect: { id: message.guild.id } },
                    messageId: message.id,
                    channelId: message.channel.id,
                    timestamp: message.createdAt,
                });
                return [4 /*yield*/, handleStickyMessage(stickyMessageCache, message)];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
