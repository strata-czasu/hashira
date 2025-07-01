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
exports.miscellaneous = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
var paginate_1 = require("@hashira/paginate");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("./base");
var transferManager_1 = require("./economy/managers/transferManager");
var mutes_1 = require("./moderation/mutes");
var warns_1 = require("./moderation/warns");
var specializedConstants_1 = require("./specializedConstants");
var asyncFunction_1 = require("./util/asyncFunction");
var discordTry_1 = require("./util/discordTry");
var errorFollowUp_1 = require("./util/errorFollowUp");
var fetchMembers_1 = require("./util/fetchMembers");
var isOwner_1 = require("./util/isOwner");
var parseUsers_1 = require("./util/parseUsers");
exports.miscellaneous = new core_1.Hashira({ name: "miscellaneous" })
    .use(base_1.base)
    .group("misc", function (group) {
    return group
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
        .setDescription("Miscellaneous commands")
        .addCommand("parse-statbot", function (command) {
        return command
            .setDescription("Parse a Statbot output")
            .addAttachment("csv", function (option) {
            return option.setDescription("The CSV file to parse");
        })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var content, lines, ids, attachment;
            var csv = _b.csv;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (csv.size > 100000)
                            return [2 /*return*/];
                        return [4 /*yield*/, fetch(csv.url).then(function (res) { return res.text(); })];
                    case 1:
                        content = _c.sent();
                        lines = content.split("\n");
                        ids = lines.slice(1).map(function (line) {
                            var _a = line.split(","), _ = _a[0], __ = _a[1], id = _a[2];
                            return "<@".concat(id, ">");
                        });
                        attachment = new discord_js_1.AttachmentBuilder(Buffer.from(ids.join(" ")), {
                            name: "parsed.txt",
                        });
                        return [4 /*yield*/, itx.reply({ files: [attachment] })];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("add-role", function (command) {
        return command
            .setDescription("Add a role to a list of users")
            .addAttachment("users", function (option) {
            return option.setDescription("The users to add the role to");
        })
            .addRole("role", function (option) {
            return option.setDescription("The role to add to the user");
        })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var content, members;
            var users = _b.users, role = _b.role;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        // Don't allow for more than 10 kilobytes of users
                        if (users.size > 20000)
                            return [2 /*return*/];
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, fetch(users.url).then(function (res) { return res.text(); })];
                    case 2:
                        content = _c.sent();
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, (0, parseUsers_1.parseUserMentions)(content))];
                    case 3:
                        members = _c.sent();
                        return [4 /*yield*/, itx.editReply("Fetched members, now adding roles.")];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, Promise.all(members.map(function (member) { return member.roles.add(role.id); }))];
                    case 5:
                        _c.sent();
                        return [4 /*yield*/, itx.editReply("Added role to users")];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("last-mutes", function (command) {
        return command
            .setDescription("Get the last mutes")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginate, formatMute, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = { guildId: itx.guildId };
                        paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.mute.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.mute.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatMute = (0, mutes_1.createFormatMuteInList)({ includeUser: true });
                        paginatedView = new core_1.PaginatedView(paginate, "Ostatnie wyciszenia", formatMute, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("show-pending-tasks", function (command) {
        return command
            .setDescription("Show pending tasks")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginate, formatTask, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = { status: "pending" };
                        paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.task.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.task.count({ where: where }); });
                        formatTask = function (_a) {
                            var id = _a.id, data = _a.data, createdAt = _a.createdAt, handleAfter = _a.handleAfter, identifier = _a.identifier;
                            var lines = [
                                (0, discord_js_1.heading)("Task ".concat(id), discord_js_1.HeadingLevel.Three),
                                "Created at: ".concat((0, discord_js_1.time)(createdAt)),
                                "Handle after: ".concat((0, discord_js_1.time)(handleAfter)),
                                "Identifier: ".concat(identifier),
                                "Data: ".concat((0, discord_js_1.inlineCode)(JSON.stringify(data))),
                            ];
                            return lines.join("\n");
                        };
                        paginatedView = new core_1.PaginatedView(paginate, "Pending tasks", formatTask, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("last-warns", function (command) {
        return command
            .setDescription("Get the last warns")
            .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var where, paginate, formatWarn, paginatedView;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        where = { guildId: itx.guildId };
                        paginate = new db_1.DatabasePaginator(function (props, createdAt) {
                            return prisma.warn.findMany(__assign(__assign({ where: where }, props), { orderBy: { createdAt: createdAt } }));
                        }, function () { return prisma.warn.count({ where: where }); }, { pageSize: 5, defaultOrder: paginate_1.PaginatorOrder.DESC });
                        formatWarn = (0, warns_1.createWarnFormat)({ includeUser: true });
                        paginatedView = new core_1.PaginatedView(paginate, "Ostatnie ostrzeżenia", formatWarn, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("last-added-channels", function (command) {
        return command
            .setDescription("Get the last added channels")
            .handle(function (_, __, itx) { return __awaiter(void 0, void 0, void 0, function () {
            var channels, paginator, formatChannel, paginatedView;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        channels = itx.guild.channels.cache;
                        paginator = new paginate_1.StaticPaginator({
                            items: __spreadArray([], channels.values(), true),
                            pageSize: 10,
                            compare: function (a, b) { var _a, _b; return (_a = a.createdTimestamp) !== null && _a !== void 0 ? _a : 0 - ((_b = b.createdTimestamp) !== null && _b !== void 0 ? _b : 0); },
                        });
                        formatChannel = function (channel) {
                            var _a;
                            return "".concat(channel.name, " (").concat(channel.id, ") - ").concat((0, discord_js_1.time)((_a = channel.createdAt) !== null && _a !== void 0 ? _a : new Date()));
                        };
                        paginatedView = new core_1.PaginatedView(paginator, "Ostatnio dodane kanały", formatChannel, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("did-not-react", function (command) {
        return command
            .setDescription("Pokaż osoby z roli, które nie zareagowały na wiadomość")
            .addString("message", function (message) { return message.setDescription("ID wiadomości"); })
            .addRole("role", function (role) { return role.setDescription("Rola"); })
            .addString("emoji", function (emoji) { return emoji.setDescription("Emoji"); })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var message, reaction, users, reactedMembers, notReactedMembers, paginator, paginatedView;
            var messageId = _b.message, role = _b.role, emojiName = _b.emoji;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () { return __awaiter(void 0, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                                return [2 /*return*/, (_a = itx.channel) === null || _a === void 0 ? void 0 : _a.messages.fetch(messageId)];
                            }); }); }, [discord_js_1.RESTJSONErrorCodes.UnknownChannel], function () { return null; })];
                    case 2:
                        message = _c.sent();
                        if (!!message) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono wiadomości")];
                    case 3: return [2 /*return*/, _c.sent()];
                    case 4:
                        reaction = message.reactions.cache.find(function (reaction) { return reaction.emoji.name === emojiName; });
                        if (!!reaction) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie znaleziono reakcji")];
                    case 5: return [2 /*return*/, _c.sent()];
                    case 6: return [4 /*yield*/, reaction.users.fetch()];
                    case 7:
                        users = _c.sent();
                        return [4 /*yield*/, (0, fetchMembers_1.fetchMembers)(itx.guild, users.map(function (user) { return user.id; }))];
                    case 8:
                        reactedMembers = _c.sent();
                        notReactedMembers = role.members.filter(function (member) { return !reactedMembers.has(member.id); });
                        paginator = new paginate_1.StaticPaginator({
                            items: __spreadArray([], notReactedMembers.values(), true),
                            pageSize: 10,
                        });
                        paginatedView = new core_1.PaginatedView(paginator, "Osoby, które nie zareagowały", function (member) { return "".concat(member.user.tag, " (").concat(member.id, ")"); }, true);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 9:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("clean-balances", function (command) {
        return command.setDescription("Clean balances").handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, prisma.wallet.updateMany({
                                where: { guildId: itx.guildId },
                                data: { balance: 0 },
                            })];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, itx.editReply("Balances cleaned")];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("add-balance-to-role", function (command) {
        return command
            .setDescription("Add balance to role")
            .addRole("role", function (role) { return role.setDescription("Role"); })
            .addInteger("amount", function (amount) { return amount.setDescription("Amount"); })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var members;
            var prisma = _c.prisma;
            var role = _d.role, amount = _d.amount;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _e.sent();
                        members = __spreadArray([], role.members.keys(), true);
                        return [4 /*yield*/, (0, transferManager_1.addBalances)({
                                prisma: prisma,
                                fromUserId: itx.user.id,
                                guildId: itx.guildId,
                                toUserIds: members,
                                amount: amount,
                                reason: "Added balance to role",
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            })];
                    case 2:
                        _e.sent();
                        return [4 /*yield*/, itx.editReply("Added balance to role")];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("check-remaining-user-permisisons", function (command) {
        return command
            .setDescription("Find all channels where the user has per-user permissions")
            .addUser("user", function (user) { return user.setDescription("User"); })
            .handle(function (_1, _a, itx_1) { return __awaiter(void 0, [_1, _a, itx_1], void 0, function (_, _b, itx) {
            var channels, overrides, paginator, paginatedView;
            var user = _b.user;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, itx.guild.channels.fetch()];
                    case 2:
                        channels = _c.sent();
                        overrides = channels
                            .mapValues(function (channel) { return channel === null || channel === void 0 ? void 0 : channel.permissionOverwrites.resolve(user.id); })
                            .filter(es_toolkit_1.isNotNil);
                        paginator = new paginate_1.StaticPaginator({
                            items: __spreadArray([], overrides.keys(), true).map(discord_js_1.channelMention),
                            pageSize: 10,
                        });
                        paginatedView = new core_1.PaginatedView(paginator, "Channels with per-user permissions", function (channel) { return channel; }, false);
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    })
        .addCommand("eval", function (command) {
        return command
            .setDescription("Evaluate code")
            .addString("code", function (code) { return code.setDescription("Code").setRequired(false); })
            .handle(function (ctx_1, _a, itx_1) { return __awaiter(void 0, [ctx_1, _a, itx_1], void 0, function (ctx, _b, itx) {
            var responder, code, customId_1, submitAction, lines, result, fn, error_1, strVal, attachment;
            var _c;
            var rawCode = _b.code;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, (0, isOwner_1.isNotOwner)(itx.user)];
                    case 1:
                        if (_d.sent())
                            return [2 /*return*/];
                        responder = itx.reply.bind(itx);
                        if (!rawCode) return [3 /*break*/, 2];
                        code = rawCode;
                        return [3 /*break*/, 5];
                    case 2:
                        customId_1 = "eval-".concat(itx.id);
                        return [4 /*yield*/, itx.showModal(new discord_js_1.ModalBuilder()
                                .setTitle("Eval")
                                .setCustomId(customId_1)
                                .addComponents(new discord_js_1.ActionRowBuilder({
                                components: [
                                    new discord_js_1.TextInputBuilder()
                                        .setCustomId("code-".concat(itx.id))
                                        .setLabel("Code")
                                        .setPlaceholder("Code")
                                        .setStyle(discord_js_1.TextInputStyle.Paragraph),
                                ],
                            })))];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, (0, discordTry_1.discordTry)(function () {
                                return itx.awaitModalSubmit({
                                    time: 60000,
                                    filter: function (modal) { return modal.customId === customId_1; },
                                });
                            }, [discord_js_1.DiscordjsErrorCodes.InteractionCollectorError], function () { return null; })];
                    case 4:
                        submitAction = _d.sent();
                        if (!submitAction)
                            return [2 /*return*/];
                        responder = submitAction.reply.bind(submitAction);
                        code = submitAction.fields.getTextInputValue("code-".concat(itx.id));
                        _d.label = 5;
                    case 5:
                        lines = code.split("\n").map(function (line) { return line.trim(); });
                        if (!((_c = lines.at(-1)) === null || _c === void 0 ? void 0 : _c.includes("return"))) {
                            lines[lines.length - 1] = "return ".concat(lines.at(-1));
                        }
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 8, , 10]);
                        fn = (0, asyncFunction_1.AsyncFunction)("ctx", "itx", lines.join("\n"));
                        return [4 /*yield*/, fn(ctx, itx)];
                    case 7:
                        result = _d.sent();
                        return [3 /*break*/, 10];
                    case 8:
                        error_1 = _d.sent();
                        return [4 /*yield*/, responder({ content: "Error: ".concat(error_1), flags: "Ephemeral" })];
                    case 9:
                        _d.sent();
                        return [2 /*return*/];
                    case 10:
                        strVal = typeof result === "string" ? result : JSON.stringify(result, null, 2);
                        if (!(0, es_toolkit_1.isNil)(strVal)) return [3 /*break*/, 12];
                        return [4 /*yield*/, responder({ content: "No result" })];
                    case 11:
                        _d.sent();
                        return [2 /*return*/];
                    case 12:
                        if (!(strVal.length > 2000)) return [3 /*break*/, 14];
                        attachment = new discord_js_1.AttachmentBuilder(Buffer.from(strVal), {
                            name: "result.txt",
                        });
                        return [4 /*yield*/, responder({ files: [attachment] })];
                    case 13:
                        _d.sent();
                        return [2 /*return*/];
                    case 14: return [4 /*yield*/, responder({ content: strVal })];
                    case 15:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
