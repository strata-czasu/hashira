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
exports.getDefaultWallets = exports.getWallet = exports.getDefaultWallet = void 0;
var specializedConstants_1 = require("../../specializedConstants");
var economyError_1 = require("../economyError");
var currencyManager_1 = require("./currencyManager");
var getDefaultWalletName = function (guildId) {
    if (specializedConstants_1.GUILD_IDS.StrataCzasu === guildId)
        return specializedConstants_1.STRATA_CZASU_CURRENCY.defaultWalletName;
    return "Wallet";
};
var createDefaultWallets = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var values, returnedUserIds, usersWithoutWallets;
    var prisma = _b.prisma, currencyId = _b.currencyId, guildId = _b.guildId, userIds = _b.userIds;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                values = userIds.map(function (userId) {
                    return ({
                        name: getDefaultWalletName(guildId),
                        userId: userId,
                        guildId: guildId,
                        currencyId: currencyId,
                        default: true,
                    });
                });
                return [4 /*yield*/, prisma.wallet.createManyAndReturn({ data: values })];
            case 1:
                returnedUserIds = _c.sent();
                usersWithoutWallets = userIds.filter(function (userId) { return !returnedUserIds.some(function (wallet) { return wallet.userId === userId; }); });
                if (returnedUserIds.length !== userIds.length)
                    throw new economyError_1.WalletCreationError(usersWithoutWallets);
                return [2 /*return*/, returnedUserIds];
        }
    });
}); };
var createDefaultWallet = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var walletName;
    var prisma = _b.prisma, currencyId = _b.currencyId, guildId = _b.guildId, userId = _b.userId;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                walletName = getDefaultWalletName(guildId);
                return [4 /*yield*/, prisma.wallet.create({
                        data: {
                            name: walletName,
                            userId: userId,
                            guildId: guildId,
                            currencyId: currencyId,
                            default: true,
                        },
                    })];
            case 1: return [2 /*return*/, _c.sent()];
        }
    });
}); };
var getDefaultWallet = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, userId = _a.userId, guildId = _a.guildId, currencyOptions = __rest(_a, ["prisma", "userId", "guildId"]);
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, wallet, defaultWallet;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: prisma, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                return [4 /*yield*/, tx.wallet.findFirst({
                                        where: {
                                            userId: userId,
                                            guildId: guildId,
                                            default: true,
                                            currencyId: currency.id,
                                        },
                                    })];
                            case 2:
                                wallet = _a.sent();
                                if (wallet)
                                    return [2 /*return*/, wallet];
                                return [4 /*yield*/, createDefaultWallets({
                                        prisma: tx,
                                        currencyId: currency.id,
                                        guildId: guildId,
                                        userIds: [userId],
                                    })];
                            case 3:
                                defaultWallet = (_a.sent())[0];
                                if (!defaultWallet)
                                    throw new economyError_1.WalletCreationError([userId]);
                                return [2 /*return*/, defaultWallet];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _b.sent()];
        }
    });
}); };
exports.getDefaultWallet = getDefaultWallet;
var getWallet = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, userId = _a.userId, guildId = _a.guildId, walletName = _a.walletName, currencyOptions = __rest(_a, ["prisma", "userId", "guildId", "walletName"]);
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, walletCondition, wallet, defaultWallet;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: tx, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                walletCondition = walletName ? { name: walletName } : { default: true };
                                return [4 /*yield*/, tx.wallet.findFirst({
                                        where: __assign({ userId: userId, guildId: guildId, currencyId: currency.id }, walletCondition),
                                    })];
                            case 2:
                                wallet = _a.sent();
                                if (wallet)
                                    return [2 /*return*/, wallet];
                                if (walletName)
                                    throw new economyError_1.WalletNotFoundError(walletName);
                                return [4 /*yield*/, createDefaultWallet({
                                        prisma: tx,
                                        currencyId: currency.id,
                                        guildId: guildId,
                                        userId: userId,
                                    })];
                            case 3:
                                defaultWallet = _a.sent();
                                if (!defaultWallet)
                                    throw new economyError_1.WalletCreationError([userId]);
                                return [2 /*return*/, defaultWallet];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _b.sent()];
        }
    });
}); };
exports.getWallet = getWallet;
var getDefaultWallets = function (_a) { return __awaiter(void 0, void 0, void 0, function () {
    var prisma = _a.prisma, userIds = _a.userIds, guildId = _a.guildId, currencyOptions = __rest(_a, ["prisma", "userIds", "guildId"]);
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                    var currency, wallets, missingWallets, createdDefaultWallets;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, currencyManager_1.getCurrency)(__assign({ prisma: tx, guildId: guildId }, currencyOptions))];
                            case 1:
                                currency = _a.sent();
                                return [4 /*yield*/, tx.wallet.findMany({
                                        where: {
                                            userId: { in: userIds },
                                            guildId: guildId,
                                            currencyId: currency.id,
                                            default: true,
                                        },
                                    })];
                            case 2:
                                wallets = _a.sent();
                                if (wallets.length === userIds.length)
                                    return [2 /*return*/, wallets];
                                missingWallets = userIds.filter(function (userId) { return !wallets.some(function (wallet) { return wallet.userId === userId; }); });
                                if (missingWallets.length === 0)
                                    return [2 /*return*/, wallets];
                                return [4 /*yield*/, createDefaultWallets({
                                        prisma: tx,
                                        currencyId: currency.id,
                                        guildId: guildId,
                                        userIds: missingWallets,
                                    })];
                            case 3:
                                createdDefaultWallets = _a.sent();
                                return [2 /*return*/, __spreadArray(__spreadArray([], wallets, true), createdDefaultWallets, true)];
                        }
                    });
                }); })];
            case 1: return [2 /*return*/, _b.sent()];
        }
    });
}); };
exports.getDefaultWallets = getDefaultWallets;
