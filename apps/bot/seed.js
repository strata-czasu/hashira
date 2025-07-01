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
var db_1 = require("@hashira/db");
var specializedConstants_1 = require("./src/specializedConstants");
var ensureUsersExist_1 = require("./src/util/ensureUsersExist");
var isProduction = process.argv.includes("--production");
var createGuild = function (guildId) {
    return db_1.prisma.guild.createMany({ data: { id: guildId }, skipDuplicates: true });
};
var createDefaultStrataCzasuCurrency = function (guildId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, createGuild(guildId)];
            case 1:
                _a.sent();
                return [4 /*yield*/, (0, ensureUsersExist_1.ensureUserExists)(db_1.prisma, specializedConstants_1.USER_IDS.Defous)];
            case 2:
                _a.sent();
                return [4 /*yield*/, db_1.prisma.currency.createMany({
                        data: {
                            guildId: guildId,
                            name: specializedConstants_1.STRATA_CZASU_CURRENCY.name,
                            symbol: specializedConstants_1.STRATA_CZASU_CURRENCY.symbol,
                            createdBy: specializedConstants_1.USER_IDS.Defous,
                        },
                        skipDuplicates: true,
                    })];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var setDefaultLogChannels = function (guildId) { return __awaiter(void 0, void 0, void 0, function () {
    var defaultLogChannels, settings, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                defaultLogChannels = specializedConstants_1.DEFAULT_LOG_CHANNELS[guildId];
                if (!defaultLogChannels)
                    return [2 /*return*/];
                return [4 /*yield*/, createGuild(guildId)];
            case 1:
                _a.sent();
                return [4 /*yield*/, db_1.prisma.guildSettings.upsert({
                        where: { guildId: guildId },
                        create: { guildId: guildId },
                        update: {},
                    })];
            case 2:
                settings = _a.sent();
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, db_1.prisma.logSettings.create({
                        data: {
                            guildSettingsId: settings.id,
                            messageLogChannelId: defaultLogChannels.MESSAGE,
                            memberLogChannelId: defaultLogChannels.MEMBER,
                            roleLogChannelId: defaultLogChannels.ROLE,
                            moderationLogChannelId: defaultLogChannels.MODERATION,
                            profileLogChannelId: defaultLogChannels.PROFILE,
                            economyLogChannelId: defaultLogChannels.ECONOMY,
                        },
                    })];
            case 4:
                _a.sent();
                console.log("Created default logSettings for guild ".concat(guildId));
                return [3 /*break*/, 6];
            case 5:
                e_1 = _a.sent();
                // P2002: Unique constraint
                if (e_1 instanceof db_1.Prisma.PrismaClientKnownRequestError && e_1.code === "P2002") {
                    console.log("logSettings already exist for guild ".concat(guildId));
                    return [2 /*return*/];
                }
                throw e_1;
            case 6: return [2 /*return*/];
        }
    });
}); };
if (isProduction) {
    await createDefaultStrataCzasuCurrency(specializedConstants_1.GUILD_IDS.StrataCzasu);
}
else {
    var testingServers = [specializedConstants_1.GUILD_IDS.Homik, specializedConstants_1.GUILD_IDS.Piwnica];
    for (var _i = 0, testingServers_1 = testingServers; _i < testingServers_1.length; _i++) {
        var guildId = testingServers_1[_i];
        await createDefaultStrataCzasuCurrency(guildId);
        await setDefaultLogChannels(guildId);
        console.log("Seeding completed for test guild ".concat(guildId));
    }
}
console.log("Seeding completed for ".concat(isProduction ? "production" : "dev", " environment"));
await db_1.prisma.$disconnect();
await db_1.redis.disconnect();
