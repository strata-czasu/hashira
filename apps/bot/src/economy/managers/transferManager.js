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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.transferBalances = exports.transferBalance = exports.addBalances = exports.addBalance = void 0;
var transaction_1 = require("@hashira/db/transaction");
var economyError_1 = require("../economyError");
var currencyManager_1 = require("./currencyManager");
var walletManager_1 = require("./walletManager");
var addBalance = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, _b = _a.fromUserId, fromUserId = _b === void 0 ? null : _b, toUserId = _a.toUserId, guildId = _a.guildId, amount = _a.amount, reason = _a.reason, walletName = _a.walletName, currencyOptions = __rest(_a, ["prisma", "fromUserId", "toUserId", "guildId", "amount", "reason", "walletName"]);
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, wallet;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: tx, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                return [4 /*yield*/, (0, walletManager_1.getWallet)({
                                        prisma: prisma,
                                        userId: toUserId,
                                        guildId: guildId,
                                        walletName: walletName,
                                        currencyId: currency.id,
                                    })];
                            case 2:
                                wallet = _a.sent();
                                return [4 /*yield*/, tx.wallet.update({
                                        where: { id: wallet.id },
                                        data: {
                                            balance: { increment: amount },
                                            transactions: {
                                                create: {
                                                    relatedUserId: fromUserId,
                                                    amount: amount,
                                                    reason: reason,
                                                    entryType: amount > 0 ? "credit" : "debit",
                                                    transactionType: "add",
                                                },
                                            },
                                        },
                                    })];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _c.sent()];
        }
    });
}); };
exports.addBalance = addBalance;
var addBalances = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, _b = _a.fromUserId, fromUserId = _b === void 0 ? null : _b, toUserIds = _a.toUserIds, guildId = _a.guildId, amount = _a.amount, reason = _a.reason, currencyOptions = __rest(_a, ["prisma", "fromUserId", "toUserIds", "guildId", "amount", "reason"]);
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, wallets, walletIds;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: tx, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                return [4 /*yield*/, (0, walletManager_1.getDefaultWallets)({
                                        prisma: (0, transaction_1.nestedTransaction)(tx),
                                        userIds: toUserIds,
                                        guildId: guildId,
                                        currencyId: currency.id,
                                    })];
                            case 2:
                                wallets = _a.sent();
                                walletIds = wallets.map(function (wallet) { return wallet.id; });
                                return [4 /*yield*/, tx.wallet.updateMany({
                                        data: { balance: { increment: amount } },
                                        where: { id: { in: walletIds } },
                                    })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, tx.transaction.createMany({
                                        data: wallets.map(function (wallet) { return ({
                                            walletId: wallet.id,
                                            relatedUserId: fromUserId,
                                            amount: amount,
                                            reason: reason,
                                            entryType: amount > 0 ? "credit" : "debit",
                                            transactionType: "add",
                                        }); }),
                                    })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _c.sent()];
        }
    });
}); };
exports.addBalances = addBalances;
var transferBalance = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, fromUserId = _a.fromUserId, toUserId = _a.toUserId, guildId = _a.guildId, amount = _a.amount, reason = _a.reason, fromWalletName = _a.fromWalletName, toWalletName = _a.toWalletName, currencyOptions = __rest(_a, ["prisma", "fromUserId", "toUserId", "guildId", "amount", "reason", "fromWalletName", "toWalletName"]);
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, fromWallet, toWallet;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (amount <= 0)
                                    throw new economyError_1.InvalidAmountError();
                                return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: tx, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                return [4 /*yield*/, (0, walletManager_1.getWallet)({
                                        prisma: prisma,
                                        userId: fromUserId,
                                        guildId: guildId,
                                        walletName: fromWalletName,
                                        currencyId: currency.id,
                                    })];
                            case 2:
                                fromWallet = _a.sent();
                                if (fromWallet.balance < amount)
                                    throw new economyError_1.InsufficientBalanceError();
                                return [4 /*yield*/, (0, walletManager_1.getWallet)({
                                        prisma: prisma,
                                        userId: toUserId,
                                        guildId: guildId,
                                        walletName: toWalletName,
                                        currencyId: currency.id,
                                    })];
                            case 3:
                                toWallet = _a.sent();
                                if (fromWallet.id === toWallet.id)
                                    throw new economyError_1.SelfTransferError();
                                return [4 /*yield*/, tx.wallet.update({
                                        where: { id: fromWallet.id },
                                        data: {
                                            balance: { decrement: amount },
                                            transactions: {
                                                create: {
                                                    relatedUserId: toUserId,
                                                    relatedWalletId: toWallet.id,
                                                    amount: amount,
                                                    reason: reason,
                                                    entryType: "debit",
                                                    transactionType: "transfer",
                                                },
                                            },
                                        },
                                    })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, tx.wallet.update({
                                        where: { id: toWallet.id },
                                        data: {
                                            balance: { increment: amount },
                                            transactions: {
                                                create: {
                                                    relatedUserId: fromUserId,
                                                    relatedWalletId: fromWallet.id,
                                                    amount: amount,
                                                    reason: reason,
                                                    entryType: "credit",
                                                    transactionType: "transfer",
                                                },
                                            },
                                        },
                                    })];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _b.sent()];
        }
    });
}); };
exports.transferBalance = transferBalance;
var transferBalances = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, fromUserId = _a.fromUserId, toUserIds = _a.toUserIds, guildId = _a.guildId, amount = _a.amount, reason = _a.reason, currencyOptions = __rest(_a, ["prisma", "fromUserId", "toUserIds", "guildId", "amount", "reason"]);
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, fromWallet, uniqueToUserIds, sum, wallets;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (amount <= 0)
                                    throw new economyError_1.InvalidAmountError();
                                return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: tx, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                return [4 /*yield*/, (0, walletManager_1.getDefaultWallet)({
                                        prisma: (0, transaction_1.nestedTransaction)(tx),
                                        userId: fromUserId,
                                        guildId: guildId,
                                        currencySymbol: currency.symbol,
                                    })];
                            case 2:
                                fromWallet = _a.sent();
                                uniqueToUserIds = __spreadArray([], new Set(toUserIds), true);
                                sum = uniqueToUserIds.length * amount;
                                if (fromWallet.balance < sum)
                                    throw new economyError_1.InsufficientBalanceError();
                                return [4 /*yield*/, (0, walletManager_1.getDefaultWallets)({
                                        prisma: (0, transaction_1.nestedTransaction)(tx),
                                        userIds: uniqueToUserIds,
                                        guildId: guildId,
                                        currencyId: currency.id,
                                    })];
                            case 3:
                                wallets = _a.sent();
                                return [4 /*yield*/, tx.wallet.update({
                                        where: { id: fromWallet.id },
                                        data: {
                                            balance: { decrement: sum },
                                            transactions: {
                                                create: {
                                                    relatedUserId: null,
                                                    relatedWalletId: null,
                                                    amount: sum,
                                                    reason: reason,
                                                    entryType: "debit",
                                                    transactionType: "transfer",
                                                },
                                            },
                                        },
                                    })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, tx.wallet.updateMany({
                                        data: { balance: { increment: amount } },
                                        where: { id: { in: wallets.map(function (wallet) { return wallet.id; }) } },
                                    })];
                            case 5:
                                _a.sent();
                                return [4 /*yield*/, tx.transaction.createMany({
                                        data: wallets.map(function (wallet) { return ({
                                            walletId: wallet.id,
                                            relatedUserId: fromUserId,
                                            relatedWalletId: fromWallet.id,
                                            amount: amount,
                                            reason: reason,
                                            entryType: "credit",
                                            transactionType: "transfer",
                                        }); }),
                                    })];
                            case 6:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _b.sent()];
        }
    });
}); };
exports.transferBalances = transferBalances;
