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
exports.autocompleteGiveawayId = exports.leaveButtonRow = exports.giveawayButtonRow = exports.GiveawayBannerRatio = void 0;
exports.parseRewards = parseRewards;
exports.getExtension = getExtension;
exports.formatBanner = formatBanner;
exports.giveawayFooter = giveawayFooter;
exports.getStaticBanner = getStaticBanner;
exports.updateGiveaway = updateGiveaway;
exports.endGiveaway = endGiveaway;
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var sharp_1 = require("sharp");
var GiveawayBannerRatio;
(function (GiveawayBannerRatio) {
    GiveawayBannerRatio[GiveawayBannerRatio["None"] = 0] = "None";
    GiveawayBannerRatio[GiveawayBannerRatio["Auto"] = 1] = "Auto";
    GiveawayBannerRatio[GiveawayBannerRatio["Landscape"] = 2] = "Landscape";
    GiveawayBannerRatio[GiveawayBannerRatio["Portrait"] = 3] = "Portrait";
})(GiveawayBannerRatio || (exports.GiveawayBannerRatio = GiveawayBannerRatio = {}));
var joinButton = new discord_js_1.ButtonBuilder()
    .setCustomId("giveaway-option:join")
    .setLabel("Dołącz")
    .setStyle(discord_js_1.ButtonStyle.Primary);
var listButton = new discord_js_1.ButtonBuilder()
    .setCustomId("giveaway-option:list")
    .setLabel("Lista uczestników")
    .setStyle(discord_js_1.ButtonStyle.Secondary);
var giveawayButtonRow = new discord_js_1.ActionRowBuilder().addComponents(joinButton, listButton);
exports.giveawayButtonRow = giveawayButtonRow;
var leaveButton = new discord_js_1.ButtonBuilder()
    .setCustomId("leave_giveaway")
    .setLabel("Wyjdź")
    .setStyle(discord_js_1.ButtonStyle.Danger);
var leaveButtonRow = new discord_js_1.ActionRowBuilder().addComponents(leaveButton);
exports.leaveButtonRow = leaveButtonRow;
function parseRewards(input) {
    return input
        .split(",")
        .map(function (item) { return item.trim(); })
        .filter(function (item) { return item.length > 0; })
        .map(function (item) {
        var match = item.match(/^(\d+)x\s*(.+)$/i);
        if (match) {
            var num = match[1], reward = match[2];
            if (reward)
                return { id: 0, giveawayId: 0, amount: Number(num), reward: reward.trim() };
        }
        return { id: 0, giveawayId: 0, amount: 1, reward: item };
    });
}
var allowedMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
function getExtension(mimeType) {
    var _a;
    if (!mimeType)
        return "webp";
    switch (mimeType) {
        case "image/jpeg":
            return "jpg";
        default:
            return (_a = mimeType.split("/")[1]) !== null && _a !== void 0 ? _a : "webp";
    }
}
function formatBanner(banner, ratio) {
    return __awaiter(this, void 0, void 0, function () {
        var res, buffer, _a, _b, ext, targetAspect, origAspect, maxSide, targetWidth, targetHeight, metadata, loop, formatted;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!banner.contentType ||
                        !allowedMimeTypes.includes(banner.contentType) ||
                        !banner.width ||
                        !banner.height)
                        return [2 /*return*/, [null, ""]];
                    return [4 /*yield*/, fetch(banner.url)];
                case 1:
                    res = _d.sent();
                    _b = (_a = Buffer).from;
                    return [4 /*yield*/, res.arrayBuffer()];
                case 2:
                    buffer = _b.apply(_a, [_d.sent()]);
                    if (ratio === GiveawayBannerRatio.Auto) {
                        ext = getExtension(banner.contentType);
                        return [2 /*return*/, [buffer, ext]];
                    }
                    targetAspect = (function () {
                        switch (ratio) {
                            case GiveawayBannerRatio.Landscape:
                                return 3 / 1;
                            case GiveawayBannerRatio.Portrait:
                                return 2 / 3;
                            default:
                                return null;
                        }
                    })();
                    if (!targetAspect)
                        return [2 /*return*/, [null, ""]];
                    origAspect = banner.width / banner.height;
                    maxSide = Math.max(banner.width, banner.height);
                    if (origAspect >= targetAspect) {
                        targetHeight = maxSide;
                        targetWidth = Math.round(maxSide * targetAspect);
                    }
                    else {
                        targetWidth = maxSide;
                        targetHeight = Math.round(maxSide / targetAspect);
                    }
                    return [4 /*yield*/, (0, sharp_1.default)(buffer, { animated: true }).metadata()];
                case 3:
                    metadata = _d.sent();
                    loop = (_c = metadata.loop) !== null && _c !== void 0 ? _c : 0;
                    return [4 /*yield*/, (0, sharp_1.default)(buffer, { animated: true })
                            .resize(targetWidth, targetHeight, {
                            fit: "cover",
                            position: "centre",
                        })
                            .toFormat("webp", { loop: loop })
                            .toBuffer()];
                case 4:
                    formatted = _d.sent();
                    return [2 /*return*/, [formatted, "webp"]];
            }
        });
    });
}
function giveawayFooter(giveaway) {
    return "\n-# Id: ".concat(giveaway.id, " ").concat((0, discord_js_1.messageLink)(giveaway.channelId, giveaway.messageId, giveaway.guildId));
}
function getStaticBanner(title) {
    if (title.toLowerCase().includes("ruletka"))
        return "https://i.imgur.com/0O3wOcx.png";
    return "https://i.imgur.com/iov10WG.png";
}
var autocompleteGiveawayId = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var focused, results;
    var prisma = _b.prisma, itx = _b.itx;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                focused = Number(itx.options.getFocused());
                if (Number.isNaN(focused))
                    return [2 /*return*/];
                return [4 /*yield*/, prisma.giveaway.findMany({
                        where: {
                            id: { gte: focused },
                            guildId: itx.guildId,
                            authorId: itx.user.id,
                        },
                        orderBy: { endAt: "desc" },
                        take: 5,
                    })];
            case 1:
                results = _c.sent();
                return [2 /*return*/, itx.respond(results.map(function (_a) {
                        var id = _a.id;
                        return ({
                            value: id,
                            name: "".concat(id),
                        });
                    }))];
        }
    });
}); };
exports.autocompleteGiveawayId = autocompleteGiveawayId;
function updateGiveaway(message, giveaway, prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var participants, container, footerIndex;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(giveaway && message.components[0])) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.giveawayParticipant.findMany({
                            where: { giveawayId: giveaway.id, isRemoved: false },
                        })];
                case 1:
                    participants = _a.sent();
                    container = new discord_js_1.ContainerBuilder(message.components[0].toJSON());
                    footerIndex = container.components.findIndex(function (c) { var _a, _b; return ((_a = c.data) === null || _a === void 0 ? void 0 : _a.id) === 1 && ((_b = c.data) === null || _b === void 0 ? void 0 : _b.type) === discord_js_1.ComponentType.TextDisplay; });
                    if (footerIndex === -1)
                        return [2 /*return*/];
                    container.components[footerIndex] = new discord_js_1.TextDisplayBuilder().setContent("-# Uczestnicy: ".concat(participants.length, " | \u0141\u0105cznie nagr\u00F3d: ").concat(giveaway.totalRewards, " | Id: ").concat(giveaway.id));
                    return [4 /*yield*/, message.edit({ components: [container] })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function endGiveaway(message, prisma) {
    return __awaiter(this, void 0, void 0, function () {
        var giveaway, _a, rewards, participants, shuffledIds, idx, winningUsers, results, resultContainer, container, actionRowIndex, newRow;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!message.guildId)
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.giveaway.findFirst({
                            where: { messageId: message.id, guildId: message.guildId },
                        })];
                case 1:
                    giveaway = _c.sent();
                    if (!giveaway || !message.components[0])
                        return [2 /*return*/];
                    return [4 /*yield*/, prisma.$transaction([
                            prisma.giveawayReward.findMany({
                                where: { giveawayId: giveaway.id },
                            }),
                            prisma.giveawayParticipant.findMany({
                                where: { giveawayId: giveaway.id, isRemoved: false },
                            }),
                        ])];
                case 2:
                    _a = _c.sent(), rewards = _a[0], participants = _a[1];
                    shuffledIds = (0, es_toolkit_1.shuffle)(participants.map(function (p) { return p.userId; }));
                    idx = 0;
                    winningUsers = [];
                    results = rewards.map(function (_a) {
                        var reward = _a.reward, amount = _a.amount, rewardId = _a.id;
                        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
                        var slice = shuffledIds.slice(idx, (idx += amount));
                        if (slice.length > 0) {
                            winningUsers.push.apply(winningUsers, slice.map(function (userId) { return ({
                                giveawayId: giveaway.id,
                                userId: userId,
                                rewardId: rewardId,
                            }); }));
                        }
                        var mention = slice.length === 0 ? "nikt" : slice.map(function (id) { return "<@".concat(id, ">"); }).join(" ");
                        return "> ".concat(reward, " ").concat(mention);
                    });
                    if (!(winningUsers.length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.giveawayWinner.createMany({
                            data: winningUsers,
                            skipDuplicates: true,
                        })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    resultContainer = new discord_js_1.ContainerBuilder()
                        .setAccentColor(0x00ff99)
                        .addTextDisplayComponents(function (td) { return td.setContent("# :tada: Wyniki giveaway"); })
                        .addSeparatorComponents(function (s) { return s.setSpacing(discord_js_1.SeparatorSpacingSize.Large); })
                        .addTextDisplayComponents(function (td) { return td.setContent(results.join("\n")); });
                    return [4 /*yield*/, message.reply({
                            components: [resultContainer],
                            allowedMentions: { users: participants.map(function (p) { return p.userId; }) },
                            flags: discord_js_1.MessageFlags.IsComponentsV2,
                        })];
                case 5:
                    _c.sent();
                    container = new discord_js_1.ContainerBuilder(message.components[0].toJSON());
                    actionRowIndex = container.components.findIndex(function (c) { var _a, _b; return ((_a = c.data) === null || _a === void 0 ? void 0 : _a.id) === 2 && ((_b = c.data) === null || _b === void 0 ? void 0 : _b.type) === discord_js_1.ComponentType.ActionRow; });
                    if (actionRowIndex === -1)
                        return [2 /*return*/];
                    newRow = new discord_js_1.ActionRowBuilder(__assign(__assign({}, (_b = container.components[actionRowIndex]) === null || _b === void 0 ? void 0 : _b.data), { components: [
                            discord_js_1.ButtonBuilder.from(giveawayButtonRow.components[0]).setDisabled(true),
                            discord_js_1.ButtonBuilder.from(giveawayButtonRow.components[1]).setDisabled(true),
                        ] }));
                    container.components[actionRowIndex] = newRow;
                    return [4 /*yield*/, message.edit({
                            components: [container],
                        })];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
