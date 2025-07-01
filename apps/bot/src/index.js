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
exports.bot = void 0;
var core_1 = require("@hashira/core");
var env_1 = require("@hashira/env");
var instrumentation_1 = require("@prisma/instrumentation");
var Sentry = require("@sentry/bun");
var ai_1 = require("./ai");
var autoRole_1 = require("./autoRole");
var avatar_1 = require("./avatar");
var base_1 = require("./base");
var brochure_1 = require("./brochure");
var dmForwarding_1 = require("./dmForwarding");
var dmVoting_1 = require("./dmVoting");
var economy_1 = require("./economy");
var emojiCounting_1 = require("./emojiCounting/emojiCounting");
var fish_1 = require("./fish");
var guildAvailability_1 = require("./guildAvailability");
var inviteManagement_1 = require("./inviteManagement");
var discordEventLogging_1 = require("./logging/discordEventLogging");
var massDM_1 = require("./massDM");
var miscellaneous_1 = require("./miscellaneous");
var moderation_1 = require("./moderation");
var ping_1 = require("./ping");
var profile_1 = require("./profile");
var roles_1 = require("./roles");
var settings_1 = require("./settings");
var stickyMessage_1 = require("./stickyMessage/stickyMessage");
var strata_1 = require("./strata");
var ticketReminder_1 = require("./strata/ticketReminder");
var tasks_1 = require("./tasks");
var userActivity_1 = require("./userActivity");
var userComplaint_1 = require("./userComplaint");
var userTransfer_1 = require("./userTransfer");
if (env_1.default.SENTRY_DSN) {
    Sentry.init({
        dsn: env_1.default.SENTRY_DSN,
        tracesSampleRate: 0.1,
        integrations: [
            Sentry.prismaIntegration({
                // Override the default instrumentation that Sentry uses
                prismaInstrumentation: new instrumentation_1.PrismaInstrumentation(),
            }),
        ],
    });
}
exports.bot = new core_1.Hashira({ name: "bot" })
    .use(base_1.base)
    .use(discordEventLogging_1.discordEventLogging)
    .use(autoRole_1.autoRole)
    .use(avatar_1.avatar)
    .use(strata_1.strataCzasu)
    .use(dmForwarding_1.dmForwarding)
    .use(economy_1.economy)
    .use(emojiCounting_1.emojiCounting)
    .use(guildAvailability_1.guildAvailability)
    .use(miscellaneous_1.miscellaneous)
    .use(moderation_1.moderation)
    .use(profile_1.profile)
    .use(roles_1.roles)
    .use(settings_1.settings)
    .use(tasks_1.tasks)
    .use(ai_1.ai)
    .use(stickyMessage_1.stickyMessage)
    .use(brochure_1.brochure)
    .use(userActivity_1.userActivity)
    .use(userComplaint_1.userComplaint)
    .use(userTransfer_1.userTransfer)
    .use(inviteManagement_1.inviteManagement)
    .use(dmVoting_1.dmVoting)
    .use(ping_1.ping)
    .use(ticketReminder_1.ticketReminder)
    .use(massDM_1.massDM)
    .use(fish_1.fish)
    .handle("ready", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.log("Bot is ready!");
        return [2 /*return*/];
    });
}); });
if (import.meta.main) {
    // TODO: For docker, we need to handle SIGTERM, but because we use 'bun run' we don't
    // get any signals, so we need to figure out how to handle this!
    try {
        await exports.bot.start(env_1.default.BOT_TOKEN);
    }
    catch (e) {
        if (env_1.default.SENTRY_DSN)
            Sentry.captureException(e);
        console.error(e);
        throw e;
    }
}
