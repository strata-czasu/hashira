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
exports.userTransfer = void 0;
var core_1 = require("@hashira/core");
var transaction_1 = require("@hashira/db/transaction");
var discord_js_1 = require("discord.js");
var base_1 = require("../base");
var ensureUsersExist_1 = require("../util/ensureUsersExist");
var transfer_1 = require("./transfer");
exports.userTransfer = new core_1.Hashira({ name: "user-transfer" })
    .use(base_1.base)
    .command("przenieś", function (command) {
    return command
        .setDescription("Przenieś dane użytkownika")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false)
        .addUser("stary-user", function (user) {
        return user.setDescription("Użytkownik, którego dane chcesz przenieść");
    })
        .addUser("nowy-user", function (user) {
        return user.setDescription("Użytkownik, do którego chcesz przenieść dane");
    })
        .handle(function (_a, _b, itx_1) { return __awaiter(void 0, [_a, _b, itx_1], void 0, function (_c, _d, itx) {
        var confirmationLines, confirmation, responses, lines, okResponses, errorResponses, noopResponses;
        var prisma = _c.prisma;
        var oldUser = _d["stary-user"], newUser = _d["nowy-user"];
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!itx.inCachedGuild())
                        return [2 /*return*/];
                    return [4 /*yield*/, itx.deferReply()];
                case 1:
                    _e.sent();
                    confirmationLines = [
                        "Czy na pewno chcesz przenieść dane?",
                        "Z ".concat((0, discord_js_1.bold)(oldUser.tag), " (").concat((0, discord_js_1.inlineCode)(oldUser.id), ") - ").concat((0, discord_js_1.userMention)(oldUser.id)),
                        "DO ".concat((0, discord_js_1.bold)(newUser.tag), " (").concat((0, discord_js_1.inlineCode)(newUser.id), ") - ").concat((0, discord_js_1.userMention)(newUser.id)),
                        "",
                        "Dane, kt\u00F3re zostan\u0105 przeniesione (".concat(transfer_1.TRANSFER_OPERATIONS.length, "):"),
                        (0, discord_js_1.unorderedList)(transfer_1.TRANSFER_OPERATIONS.map(function (op) { return op.name; })),
                    ];
                    return [4 /*yield*/, (0, core_1.waitForConfirmation)({ send: itx.editReply.bind(itx) }, confirmationLines.join("\n"), "Tak", "Nie", function (action) { return action.user.id === itx.user.id; })];
                case 2:
                    confirmation = _e.sent();
                    if (!!confirmation) return [3 /*break*/, 4];
                    return [4 /*yield*/, itx.editReply({
                            content: "Anulowano przenoszenie danych.",
                            components: [],
                        })];
                case 3:
                    _e.sent();
                    return [2 /*return*/];
                case 4: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var oldDbUser, newDbUser;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, ensureUsersExist_1.ensureUsersExist)((0, transaction_1.nestedTransaction)(tx), [oldUser.id, newUser.id])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, tx.user.findUnique({
                                            where: { id: oldUser.id },
                                        })];
                                case 2:
                                    oldDbUser = _a.sent();
                                    return [4 /*yield*/, tx.user.findUnique({
                                            where: { id: newUser.id },
                                        })];
                                case 3:
                                    newDbUser = _a.sent();
                                    if (!oldDbUser || !newDbUser)
                                        return [2 /*return*/, []];
                                    return [4 /*yield*/, (0, transfer_1.runOperations)({
                                            prisma: (0, transaction_1.nestedTransaction)(tx),
                                            oldUser: oldUser,
                                            newUser: newUser,
                                            oldDbUser: oldDbUser,
                                            newDbUser: newDbUser,
                                            guild: itx.guild,
                                            moderator: itx.user,
                                        })];
                                case 4: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); }, { timeout: 30000 })];
                case 5:
                    responses = _e.sent();
                    lines = [];
                    okResponses = responses.filter(function (r) { return r.type === "ok"; });
                    if (okResponses.length > 0) {
                        lines.push.apply(lines, __spreadArray(__spreadArray(["Wykonane operacje:"], okResponses.map(function (r) { return "- ".concat((0, discord_js_1.bold)(r.name), ": ").concat(r.message); }), false), [""], false));
                    }
                    errorResponses = responses.filter(function (r) { return r.type === "err"; });
                    if (errorResponses.length > 0) {
                        lines.push.apply(lines, __spreadArray(__spreadArray(["Operacje z błędem (sprawdź konsolę):"], errorResponses.map(function (r) { return "- ".concat((0, discord_js_1.bold)(r.name)); }), false), [""], false));
                    }
                    noopResponses = responses.filter(function (r) { return r.type === "noop"; });
                    if (noopResponses.length > 0) {
                        lines.push.apply(lines, __spreadArray(["Pominięte operacje:"], noopResponses.map(function (r) { return "- ".concat((0, discord_js_1.bold)(r.name)); }), false));
                    }
                    return [4 /*yield*/, itx.editReply({
                            content: lines.join("\n"),
                            components: [],
                        })];
                case 6:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
