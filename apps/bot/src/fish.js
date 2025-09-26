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
exports.fish = void 0;
var core_1 = require("@hashira/core");
var bun_1 = require("bun");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("./base");
var transferManager_1 = require("./economy/managers/transferManager");
var util_1 = require("./economy/util");
var specializedConstants_1 = require("./specializedConstants");
var ensureUsersExist_1 = require("./util/ensureUsersExist");
var errorFollowUp_1 = require("./util/errorFollowUp");
var singleUseButton_1 = require("./util/singleUseButton");
var checkIfCanFish = function (prisma, userId, guildId) { return __awaiter(void 0, void 0, void 0, function () {
    var fishing, lastFishing, nextFishing, canFish;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, prisma.lastFishing.findFirst({
                    where: { userId: userId, guildId: guildId },
                    orderBy: { timestamp: "desc" },
                })];
            case 1:
                fishing = _b.sent();
                lastFishing = (_a = fishing === null || fishing === void 0 ? void 0 : fishing.timestamp) !== null && _a !== void 0 ? _a : new Date(0);
                nextFishing = (0, date_fns_1.addMinutes)(lastFishing, 60);
                canFish = (0, date_fns_1.isAfter)(new Date(), nextFishing);
                return [2 /*return*/, [canFish, nextFishing]];
        }
    });
}); };
var FISH_TABLE = [
    { id: 1, name: "buta", minAmount: 1, maxAmount: 1, weight: 1 },
    { id: 2, name: "karasia", minAmount: 30, maxAmount: 60, weight: 28 },
    { id: 3, name: "śledzia", minAmount: 50, maxAmount: 80, weight: 19 },
    { id: 4, name: "dorsza", minAmount: 60, maxAmount: 90, weight: 15 },
    { id: 5, name: "pstrąga", minAmount: 80, maxAmount: 110, weight: 10 },
    { id: 6, name: "szczupaka :crown:", minAmount: 90, maxAmount: 110, weight: 10 },
    { id: 7, name: "suma", minAmount: 110, maxAmount: 130, weight: 10 },
    { id: 8, name: "rekina", minAmount: 150, maxAmount: 180, weight: 3 },
    {
        id: 11,
        name: "<:kotoryba1:1370101554425630821><:kotoryba2:1370109036279894108>",
        minAmount: 200,
        maxAmount: 254,
        weight: 1,
    },
    { id: 9, name: "bombardiro crocodilo", minAmount: 900, maxAmount: 1100, weight: 1 },
    {
        id: 12,
        name: "<:ryboszczurka1:1393271454547710223><:ryboszczurka2:1393271478111309834>",
        minAmount: -30,
        maxAmount: -10,
        weight: 1,
    },
    { id: 10, name: "wonsza żecznego", minAmount: -130, maxAmount: -70, weight: 1 },
];
var getFishById = function (id) {
    var fish = FISH_TABLE.find(function (f) { return f.id === id; });
    if (!fish)
        return null;
    return {
        id: fish.id,
        name: fish.name,
        amount: (0, es_toolkit_1.randomInt)(fish.minAmount, fish.maxAmount + 1),
    };
};
var getRandomFish = function () {
    var totalWeight = FISH_TABLE.reduce(function (sum, fish) { return sum + fish.weight; }, 0);
    var roll = (0, es_toolkit_1.randomInt)(1, totalWeight + 1);
    for (var _i = 0, FISH_TABLE_1 = FISH_TABLE; _i < FISH_TABLE_1.length; _i++) {
        var fish_1 = FISH_TABLE_1[_i];
        roll -= fish_1.weight;
        if (roll <= 0) {
            // biome-ignore lint/style/noNonNullAssertion: This is guaranteed to find a fish
            return getFishById(fish_1.id);
        }
    }
    throw new Error("Failed to select random fish");
};
exports.fish = new core_1.Hashira({ name: "fish" })
    .use(base_1.base)
    .command("wedka", function (command) {
    return command
        .setDMPermission(false)
        .setDescription("Nielegalny połów ryb")
        .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
        var _c, canFish, nextFishing, _d, id, name, amount, balance, reminderButton, row, response, clickInfo;
        var _e;
        var prisma = _b.prisma, messageQueue = _b.messageQueue;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user)];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, checkIfCanFish(prisma, itx.user.id, itx.guildId)];
                case 2:
                    _c = _f.sent(), canFish = _c[0], nextFishing = _c[1];
                    if (!!canFish) return [3 /*break*/, 4];
                    return [4 /*yield*/, itx.reply({
                            content: "Dalej masz PZW na karku. Nast\u0119pn\u0105 ryb\u0119 mo\u017Cesz wy\u0142owi\u0107 ".concat((0, discord_js_1.time)(nextFishing, discord_js_1.TimestampStyles.RelativeTime)),
                            flags: "Ephemeral",
                        })];
                case 3:
                    _f.sent();
                    return [2 /*return*/];
                case 4:
                    _d = getRandomFish(), id = _d.id, name = _d.name, amount = _d.amount;
                    return [4 /*yield*/, (0, transferManager_1.addBalance)({
                            prisma: prisma,
                            currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            reason: "\u0141owienie ".concat(id),
                            guildId: itx.guildId,
                            toUserId: itx.user.id,
                            amount: amount,
                        })];
                case 5:
                    _f.sent();
                    return [4 /*yield*/, prisma.lastFishing.create({
                            data: { userId: itx.user.id, guildId: itx.guildId },
                        })];
                case 6:
                    _f.sent();
                    balance = (0, util_1.formatBalance)(amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                    reminderButton = new discord_js_1.ButtonBuilder()
                        .setCustomId("fish_reminder")
                        .setLabel("Przypomnij mi za godzinę")
                        .setStyle(discord_js_1.ButtonStyle.Secondary);
                    row = new discord_js_1.ActionRowBuilder().addComponents(reminderButton);
                    return [4 /*yield*/, itx.reply({
                            content: "Wy\u0142awiasz ".concat(name, " wartego ").concat(balance),
                            components: [row],
                            withResponse: true,
                        })];
                case 7:
                    response = _f.sent();
                    if (!((_e = response.resource) === null || _e === void 0 ? void 0 : _e.message)) {
                        throw new Error("Failed to receive response from interaction reply");
                    }
                    return [4 /*yield*/, (0, singleUseButton_1.waitForButtonClick)(response.resource.message, "fish_reminder", { minutes: 1 }, function (interaction) { return interaction.user.id === itx.user.id; })];
                case 8:
                    clickInfo = _f.sent();
                    if (!!clickInfo.interaction) return [3 /*break*/, 10];
                    return [4 /*yield*/, clickInfo.removeButton()];
                case 9: return [2 /*return*/, _f.sent()];
                case 10: return [4 /*yield*/, Promise.all([
                        clickInfo.interaction.reply({
                            content: "Przypomnę Ci o łowieniu za godzinę!",
                            flags: "Ephemeral",
                        }),
                        clickInfo.editButton(function (builder) {
                            return builder
                                .setDisabled(true)
                                .setLabel("Widzimy się za godzinę")
                                .setStyle(discord_js_1.ButtonStyle.Success);
                        }),
                        messageQueue.push("reminder", {
                            userId: itx.user.id,
                            guildId: itx.guildId,
                            text: "Mo\u017Cesz znowu \u0142owi\u0107 ryby! Udaj si\u0119 nad wod\u0119 i spr\u00F3buj szcz\u0119\u015Bcia! (".concat((0, discord_js_1.channelLink)(itx.channelId, itx.guildId), ")"),
                        }, (0, date_fns_1.addMinutes)(itx.createdAt, 60)),
                    ])];
                case 11:
                    _f.sent();
                    return [4 /*yield*/, (0, bun_1.sleep)((0, date_fns_1.secondsToMilliseconds)(15))];
                case 12:
                    _f.sent();
                    return [4 /*yield*/, clickInfo.removeButton()];
                case 13:
                    _f.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .group("wedka-admin", function (group) {
    return group
        .setDescription("Administracja łowienia ryb")
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addCommand("force-fish", function (command) {
        return command
            .setDescription("Zmusza użytkownika do złowienia ryby o konkretnym ID")
            .addUser("user", function (option) {
            return option.setDescription("Użytkownik który ma złowić rybę").setRequired(true);
        })
            .addInteger("fish-id", function (option) {
            var _a;
            return (_a = option
                .setDescription("ID ryby do złowienia")
                .setRequired(true))
                .addChoices.apply(_a, FISH_TABLE.map(function (fish) { return ({
                name: "".concat(fish.id, ": ").concat(fish.name),
                value: fish.id,
            }); }));
        })
            .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
            var fish, balance;
            var prisma = _c.prisma;
            var user = _d.user, fishId = _d["fish-id"];
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, user)];
                    case 1:
                        _e.sent();
                        fish = getFishById(fishId);
                        if (!fish) {
                            return [2 /*return*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Błąd: Nie znaleziono ryby o tym ID")];
                        }
                        return [4 /*yield*/, (0, transferManager_1.addBalance)({
                                prisma: prisma,
                                currencySymbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                                reason: "Admin force fish ".concat(fish.id),
                                guildId: itx.guildId,
                                toUserId: user.id,
                                amount: fish.amount,
                            })];
                    case 2:
                        _e.sent();
                        balance = (0, util_1.formatBalance)(fish.amount, specializedConstants_1.STRATA_CZASU_CURRENCY.symbol);
                        return [4 /*yield*/, itx.reply({
                                content: "".concat(user, " zosta\u0142 zmuszony do z\u0142owienia ").concat(fish.name, " wartego ").concat(balance),
                                flags: "Ephemeral",
                            })];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
