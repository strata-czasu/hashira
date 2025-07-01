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
exports.marriage = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var errorFollowUp_1 = require("../util/errorFollowUp");
exports.marriage = new core_1.Hashira({ name: "marriage" })
    .use(base_1.base)
    .command("marry", function (command) {
    return command
        .setDescription("Oświadcz się komuś")
        .setDMPermission(false)
        .addUser("user", function (user) { return user.setDescription("Użytkownik"); })
        .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
        var user, targetUser, dialog;
        var prisma = _c.prisma, lock = _c.lock;
        var targetUserId = _d.user.id;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)(prisma, [itx.user.id, targetUserId])];
                case 2:
                    _e.sent();
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: {
                                id: itx.user.id,
                            },
                        })];
                case 3:
                    user = _e.sent();
                    if (!user)
                        return [2 /*return*/];
                    if (!user.marriedTo) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Jeste\u015B ju\u017C w zwi\u0105zku z ".concat((0, discord_js_1.userMention)(user.marriedTo), "!"))];
                case 4: return [2 /*return*/, _e.sent()];
                case 5:
                    if (!(targetUserId === itx.user.id)) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie możesz oświadczyć się samemu sobie!")];
                case 6: return [2 /*return*/, _e.sent()];
                case 7: return [4 /*yield*/, prisma.user.findFirst({
                        where: {
                            id: targetUserId,
                        },
                    })];
                case 8:
                    targetUser = _e.sent();
                    if (!targetUser)
                        return [2 /*return*/];
                    if (!targetUser.marriedTo) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "".concat((0, discord_js_1.userMention)(user.id), " jest ju\u017C w zwi\u0105zku z ").concat((0, discord_js_1.userMention)(targetUser.marriedTo), "!"))];
                case 9: return [2 /*return*/, _e.sent()];
                case 10:
                    dialog = new core_1.ConfirmationDialog("".concat((0, discord_js_1.userMention)(targetUser.id), ", czy chcesz po\u015Blubi\u0107 ").concat((0, discord_js_1.userMention)(user.id), "? :ring:"), "Tak", "Nie", function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, prisma.$transaction([
                                        prisma.user.update({
                                            where: { id: user.id },
                                            data: { marriedTo: targetUser.id, marriedAt: itx.createdAt },
                                        }),
                                        prisma.user.update({
                                            where: { id: targetUser.id },
                                            data: { marriedTo: user.id, marriedAt: itx.createdAt },
                                        }),
                                    ])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, itx.editReply({
                                            content: "Gratulacje! ".concat((0, discord_js_1.userMention)(itx.user.id), " i ").concat((0, discord_js_1.userMention)(targetUser.id), " s\u0105 teraz ma\u0142\u017Ce\u0144stwem! :tada:"),
                                            components: [],
                                        })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, itx.editReply({
                                        content: "Niestety ".concat((0, discord_js_1.userMention)(itx.user.id), " odrzuci\u0142 Twoje o\u015Bwiadczyny. :broken_heart:"),
                                        components: [],
                                    })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, function (action) { return action.user.id === targetUser.id; }, function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, itx.editReply({
                                        content: "".concat((0, discord_js_1.userMention)(targetUser.id), " nie odpowiedzia\u0142 na czas."),
                                        components: [],
                                    })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, lock.run(["marriage_".concat(itx.user.id), "marriage_".concat(targetUserId)], function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, dialog.render({ send: itx.editReply.bind(itx) })];
                        }); }); }, function () {
                            return (0, errorFollowUp_1.errorFollowUp)(itx, "Masz już aktywne oświadczyny lub ktoś inny właśnie oświadczył się tej osobie! Poczekaj aż sytuacja się wyjaśni.");
                        })];
                case 11:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    }); });
})
    .command("divorce", function (command) {
    return command
        .setDescription("Rozwiedź się")
        .setDMPermission(false)
        .handle(function (_a, _1, itx_1) { return __awaiter(void 0, [_a, _1, itx_1], void 0, function (_b, _, itx) {
        var user, targetUser, dialog;
        var prisma = _b.prisma;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(prisma, itx.user.id)];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { id: itx.user.id },
                        })];
                case 3:
                    user = _c.sent();
                    if (!user)
                        return [2 /*return*/];
                    if (!!user.marriedTo) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, errorFollowUp_1.errorFollowUp)(itx, "Nie jesteś w związku!")];
                case 4: return [2 /*return*/, _c.sent()];
                case 5: return [4 /*yield*/, prisma.user.findFirst({
                        where: { id: user.marriedTo },
                    })];
                case 6:
                    targetUser = _c.sent();
                    if (!targetUser)
                        return [2 /*return*/];
                    dialog = new core_1.ConfirmationDialog("Czy na pewno chcesz si\u0119 rozwie\u015B\u0107 z ".concat((0, discord_js_1.userMention)(targetUser.id), "? :broken_heart:"), "Tak", "Nie", function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, prisma.$transaction([
                                        prisma.user.update({
                                            where: { id: user.id },
                                            data: { marriedTo: null, marriedAt: null },
                                        }),
                                        prisma.user.update({
                                            where: { id: targetUser.id },
                                            data: { marriedTo: null, marriedAt: null },
                                        }),
                                    ])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, itx.editReply({
                                            content: "".concat((0, discord_js_1.userMention)(itx.user.id), " i ").concat((0, discord_js_1.userMention)(targetUser.id), " nie s\u0105 ju\u017C ma\u0142\u017Ce\u0144stwem. :broken_heart:"),
                                            components: [],
                                        })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, itx.editReply({
                                        content: "Rozwód anulowany.",
                                        components: [],
                                    })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, function (action) { return action.user.id === user.id; }, function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, itx.editReply({
                                        content: "Minął czas na decyzję.",
                                        components: [],
                                    })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [4 /*yield*/, dialog.render({ send: itx.editReply.bind(itx) })];
                case 7:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
