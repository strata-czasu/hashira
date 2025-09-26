"use strict";
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
exports.allEvents = exports.allCustomEvents = exports.guildMessageCreate = exports.directMessageCreate = exports.interactionCreate = exports.readyEvents = exports.guildInvitesEvents = exports.guildWebhooksEvents = exports.guildVoiceStatesEvents = exports.guildPresencesEvents = exports.guildMessageTypingEvents = exports.guildIntegrationsEvents = exports.autoModerationActionExecutionEvents = exports.guildScheduledEventsEvents = exports.guildModerationEvents = exports.guildMembersEvents = exports.guildMessageReactionsEvents = exports.guildMessagesEvents = exports.guildsEvents = exports.guildEmojisAndStickersEvents = exports.autoModerationConfigurationEvents = void 0;
exports.autoModerationConfigurationEvents = [
    "autoModerationRuleCreate",
    "autoModerationRuleUpdate",
    "autoModerationRuleDelete",
];
exports.guildEmojisAndStickersEvents = [
    "emojiCreate",
    "emojiDelete",
    "emojiUpdate",
    "stickerCreate",
    "stickerDelete",
    "stickerUpdate",
];
exports.guildsEvents = [
    "guildAvailable",
    "guildCreate",
    "guildUpdate",
    "guildDelete",
    "roleCreate",
    "roleUpdate",
    "roleDelete",
    "channelCreate",
    "channelUpdate",
    "channelDelete",
    "channelPinsUpdate",
    "threadCreate",
    "threadUpdate",
    "threadDelete",
    "threadListSync",
    "threadMemberUpdate",
    "threadMembersUpdate",
    "stageInstanceCreate",
    "stageInstanceUpdate",
    "stageInstanceDelete",
];
exports.guildMessagesEvents = [
    "messageCreate",
    "messageUpdate",
    "messageDelete",
    "messageDeleteBulk",
];
exports.guildMessageReactionsEvents = [
    "messageReactionAdd",
    "messageReactionRemove",
    "messageReactionRemoveAll",
    "messageReactionRemoveEmoji",
];
exports.guildMembersEvents = [
    "guildMemberAdd",
    "guildMemberAvailable",
    "guildMemberUpdate",
    "guildMemberRemove",
];
exports.guildModerationEvents = [
    "guildAuditLogEntryCreate",
    "guildBanAdd",
    "guildBanRemove",
];
exports.guildScheduledEventsEvents = [
    "guildScheduledEventCreate",
    "guildScheduledEventUpdate",
    "guildScheduledEventDelete",
    "guildScheduledEventUserAdd",
    "guildScheduledEventUserRemove",
];
exports.autoModerationActionExecutionEvents = [
    "autoModerationActionExecution",
];
exports.guildIntegrationsEvents = ["guildIntegrationsUpdate"];
exports.guildMessageTypingEvents = ["typingStart"];
exports.guildPresencesEvents = ["presenceUpdate"];
exports.guildVoiceStatesEvents = ["voiceStateUpdate"];
exports.guildWebhooksEvents = ["webhooksUpdate"];
exports.guildInvitesEvents = ["inviteCreate", "inviteDelete"];
exports.readyEvents = ["ready", "shardReady"];
exports.interactionCreate = ["interactionCreate"];
exports.directMessageCreate = ["directMessageCreate"];
exports.guildMessageCreate = ["guildMessageCreate"];
exports.allCustomEvents = __spreadArray(__spreadArray([], exports.directMessageCreate, true), exports.guildMessageCreate, true);
exports.allEvents = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], exports.autoModerationConfigurationEvents, true), exports.autoModerationActionExecutionEvents, true), exports.guildEmojisAndStickersEvents, true), exports.guildsEvents, true), exports.guildInvitesEvents, true), exports.guildMembersEvents, true), exports.guildMessagesEvents, true), exports.guildMessageReactionsEvents, true), exports.guildMessageTypingEvents, true), exports.guildModerationEvents, true), exports.guildPresencesEvents, true), exports.guildScheduledEventsEvents, true), exports.guildVoiceStatesEvents, true), exports.guildWebhooksEvents, true), exports.readyEvents, true), exports.interactionCreate, true), exports.allCustomEvents, true);
