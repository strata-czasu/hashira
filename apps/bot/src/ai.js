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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
var core_1 = require("@hashira/core");
var env_1 = require("@hashira/env");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var openai_1 = require("openai");
var base_1 = require("./base");
var mutes_1 = require("./moderation/mutes");
var asyncFunction_1 = require("./util/asyncFunction");
var duration_1 = require("./util/duration");
var isOwner_1 = require("./util/isOwner");
var safeSendCode_1 = require("./util/safeSendCode");
var safeSendLongMessage_1 = require("./util/safeSendLongMessage");
var createMute = function (prisma, messageQueue, log, guild, moderator, reply, replyToModerator) {
    function mute(_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var userId = _b.userId, duration = _b.duration, reason = _b.reason;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, mutes_1.universalAddMute)({
                            prisma: prisma,
                            messageQueue: messageQueue,
                            log: log,
                            userId: userId,
                            guild: guild,
                            moderator: moderator,
                            duration: duration,
                            reason: reason,
                            reply: reply,
                            replyToModerator: replyToModerator,
                        })];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    return mute;
};
var createGetLatestMutes = function (prisma, guildId) {
    return function getLatestMutes(_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var mutes, now;
            var userId = _b.userId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.mute.findMany({
                            where: { guildId: guildId, userId: userId, deletedAt: null },
                            orderBy: { createdAt: "desc" },
                            take: 5,
                        })];
                    case 1:
                        mutes = _c.sent();
                        now = new Date();
                        return [2 /*return*/, mutes.map(function (mute) { return (__assign({ id: mute.id, mutedBy: mute.moderatorId, reason: mute.reason, duration: (0, duration_1.formatDuration)((0, date_fns_1.intervalToDuration)({ start: mute.createdAt, end: mute.endsAt })) }, ((0, date_fns_1.isAfter)(now, mute.endsAt)
                                ? {
                                    timeSinceEnd: (0, duration_1.formatDuration)((0, date_fns_1.intervalToDuration)({ start: mute.endsAt, end: now })),
                                }
                                : {}))); })];
                }
            });
        });
    };
};
var createGetLatestWarns = function (prisma, guildId) {
    return function getLatestWarns(_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var warns;
            var userId = _b.userId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.warn.findMany({
                            where: { guildId: guildId, userId: userId, deletedAt: null },
                            orderBy: { createdAt: "desc" },
                            take: 5,
                        })];
                    case 1:
                        warns = _c.sent();
                        return [2 /*return*/, warns.map(function (warn) { return ({
                                id: warn.id,
                                warnedBy: warn.moderatorId,
                                reason: warn.reason,
                                timeSince: (0, duration_1.formatDuration)((0, date_fns_1.intervalToDuration)({ start: warn.createdAt, end: new Date() })),
                            }); })];
                }
            });
        });
    };
};
var createCodeInterpreter = function (context) {
    return function interpretCode(_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var result, confirmation;
            var _this = this;
            var code = _b.code;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, safeSendCode_1.default)(context.channel.send.bind(context.channel), code, "js")];
                    case 1:
                        _c.sent();
                        confirmation = new core_1.ConfirmationDialog("Are you sure you want to run this code?", "Yes", "No", function () { return __awaiter(_this, void 0, void 0, function () {
                            var fn, error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 4]);
                                        fn = (0, asyncFunction_1.AsyncFunction)("prisma", "guild", "moderator", "channel", code);
                                        return [4 /*yield*/, fn(context.prisma, context.guild, context.invokedBy, context.channel)];
                                    case 1:
                                        result = _a.sent();
                                        return [3 /*break*/, 4];
                                    case 2:
                                        error_1 = _a.sent();
                                        return [4 /*yield*/, context.invokedBy.send("Error: ".concat(error_1))];
                                    case 3:
                                        _a.sent();
                                        throw error_1;
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }, function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                result = "Code execution cancelled by user interaction or timeout.";
                                return [2 /*return*/];
                            });
                        }); }, function (interaction) { return interaction.user.id === context.invokedBy.id; });
                        return [4 /*yield*/, confirmation.render({ send: context.channel.send.bind(context.channel) })];
                    case 2:
                        _c.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
};
var readInterpreterFunction = function (invoker, context) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, isOwner_1.isNotOwner)(invoker)];
            case 1:
                if (_a.sent())
                    return [2 /*return*/, []];
                return [2 /*return*/, [
                        {
                            type: "function",
                            function: {
                                function: createCodeInterpreter(context),
                                description: "Write a code snippet to run in the context of the bot.\nYou can import using `import { ... } from 'module'`.\nThe code will be executed inside of a function with the following signature:\n```ts\nasync function (prisma: ExtendedPrismaClient, guild: Guild, moderator: GuildMember, channel: GuildTextBasedChannel): Promise<unknown> {\n  // Your code here\n}\n```\nDo not write the function signature, just the code inside the function.",
                                parse: JSON.parse,
                                parameters: {
                                    type: "object",
                                    properties: {
                                        code: {
                                            type: "string",
                                            description: "The code snippet to run. It should be a valid JavaScript code. It should always return a value.",
                                        },
                                    },
                                },
                            },
                        },
                    ]];
        }
    });
}); };
var snowflake = {
    type: "string",
    pattern: "^\\d+$",
    description: "A Discord snowflake. Can be parsed from mention like <@id>, <#id>.",
};
exports.ai = new core_1.Hashira({ name: "ai" })
    .use(base_1.base)
    .const("ai", env_1.default.OPENAI_KEY ? new openai_1.default({ apiKey: env_1.default.OPENAI_KEY }) : null)
    .handle("messageCreate", function (_a, message_1) { return __awaiter(void 0, [_a, message_1], void 0, function (_b, message) {
    var botMention, content, thread, prompt, runner, _c, _d, _e, response;
    var _f;
    var ai = _b.ai, prisma = _b.prisma, messageQueue = _b.messageQueue, moderationLog = _b.moderationLog;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                if (!ai)
                    return [2 /*return*/];
                if (message.author.bot)
                    return [2 /*return*/];
                if (!message.inGuild())
                    return [2 /*return*/];
                if (message.channel.type !== discord_js_1.ChannelType.GuildText)
                    return [2 /*return*/];
                if (!message.member)
                    return [2 /*return*/];
                if (!message.member.permissions.has("ModerateMembers"))
                    return [2 /*return*/];
                botMention = (0, discord_js_1.userMention)(message.client.user.id);
                if (!message.content.startsWith(botMention))
                    return [2 /*return*/];
                content = message.content.slice(botMention.length).trim();
                if (!content)
                    return [2 /*return*/];
                return [4 /*yield*/, message.startThread({ name: "AI Command" })];
            case 1:
                thread = _g.sent();
                prompt = [
                    "You are a helpful moderation assistant for a Discord server. Formulate your responses in Polish. Your name is Biszkopt, a male assistant.",
                    "You cannot interact with the moderator, only provide them with information and perform actions.",
                    "If not given snowflake, respond that you need a user to be mentioned or their id.",
                    "Current time: ".concat((0, date_fns_1.format)(new Date(), "EEEE yyyy-MM-dd HH:mm:ss XXX")),
                ];
                _d = (_c = ai.beta.chat.completions)
                    .runTools;
                _f = {
                    model: "gpt-5",
                    messages: [
                        {
                            role: "system",
                            content: prompt.join("\n"),
                        },
                        {
                            role: "user",
                            content: content,
                        },
                    ]
                };
                _e = [[
                        {
                            type: "function",
                            function: {
                                function: createMute(prisma, messageQueue, moderationLog, message.guild, message.author, function (content) { return message.reply(content); }, function (content) { return message.author.send(content); }),
                                parse: JSON.parse,
                                description: "Mute a user.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        userId: snowflake,
                                        duration: { type: "string", pattern: "^(\\d+)([hmsd])$" },
                                        reason: { type: "string" },
                                    },
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                function: createGetLatestMutes(prisma, message.guild.id),
                                description: "Get the latest 5 mutes for the user.",
                                parse: JSON.parse,
                                parameters: {
                                    type: "object",
                                    properties: {
                                        userId: snowflake,
                                    },
                                },
                            },
                        },
                        {
                            type: "function",
                            function: {
                                function: createGetLatestWarns(prisma, message.guild.id),
                                description: "Get the latest warns for the user.",
                                parse: JSON.parse,
                                parameters: {
                                    type: "object",
                                    properties: {
                                        userId: snowflake,
                                    },
                                },
                            },
                        }
                    ]];
                return [4 /*yield*/, readInterpreterFunction(message.member, {
                        prisma: prisma,
                        guild: message.guild,
                        invokedBy: message.member,
                        channel: message.channel,
                    })];
            case 2:
                runner = _d.apply(_c, [(_f.tools = __spreadArray.apply(void 0, _e.concat([(_g.sent()), true])),
                        _f)])
                    .on("message", function (message) { return __awaiter(void 0, void 0, void 0, function () {
                    var content_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(typeof message.content === "string" && message.role !== "tool")) return [3 /*break*/, 2];
                                content_1 = "".concat(message.role === "system" ? "Biszkopt" : message.role, ": ").concat(message.content);
                                return [4 /*yield*/, (0, safeSendLongMessage_1.default)(thread.send.bind(thread), content_1)];
                            case 1:
                                _a.sent();
                                _a.label = 2;
                            case 2: return [2 /*return*/];
                        }
                    });
                }); });
                return [4 /*yield*/, message.channel.sendTyping()];
            case 3:
                _g.sent();
                return [4 /*yield*/, runner.finalContent()];
            case 4:
                response = _g.sent();
                return [4 /*yield*/, message.reply(response !== null && response !== void 0 ? response : "I'm sorry, I don't understand that.")];
            case 5:
                _g.sent();
                return [2 /*return*/];
        }
    });
}); });
