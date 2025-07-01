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
Object.defineProperty(exports, "__esModule", { value: true });
exports.allEventsToIntent = exports.customEventsToIntent = exports.guildMessageCreateToIntent = exports.directMessageCreateToIntent = exports.interactionCreateToIntent = exports.readyEventsToIntent = exports.guildWebhooksEventsToIntent = exports.guildVoiceStatesEventsToIntent = exports.guildScheduledEventsEventsToIntent = exports.guildPresencesEventsToIntent = exports.guildModerationEventsToIntent = exports.guildMessageTypingEventsToIntent = exports.guildMessageReactionsEventsToIntent = exports.guildMessagesEventsToIntent = exports.guildMembersEventsToIntent = exports.guildInvitesEventsToIntent = exports.autoModerationConfigurationEventsToIntent = exports.guildsEventsToIntent = exports.guildIntegrationsEventsToIntent = exports.autoModerationActionExecutionEventsToIntent = exports.guildEmojisAndStickersEventsToIntent = void 0;
var discord_js_1 = require("discord.js");
var events = require("./events");
var util_1 = require("./util");
exports.guildEmojisAndStickersEventsToIntent = (0, util_1.createEventsToIntent)(events.guildEmojisAndStickersEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildExpressions]);
exports.autoModerationActionExecutionEventsToIntent = (0, util_1.createEventsToIntent)(events.autoModerationActionExecutionEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessageTyping]);
exports.guildIntegrationsEventsToIntent = (0, util_1.createEventsToIntent)(events.guildIntegrationsEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildIntegrations]);
exports.guildsEventsToIntent = (0, util_1.createEventsToIntent)(events.guildsEvents, [
    discord_js_1.GatewayIntentBits.Guilds,
    discord_js_1.GatewayIntentBits.GuildVoiceStates,
]);
exports.autoModerationConfigurationEventsToIntent = (0, util_1.createEventsToIntent)(events.autoModerationConfigurationEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.AutoModerationConfiguration]);
exports.guildInvitesEventsToIntent = (0, util_1.createEventsToIntent)(events.guildInvitesEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildInvites]);
exports.guildMembersEventsToIntent = (0, util_1.createEventsToIntent)(events.guildMembersEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMembers]);
exports.guildMessagesEventsToIntent = (0, util_1.createEventsToIntent)(events.guildMessagesEvents, [
    discord_js_1.GatewayIntentBits.Guilds,
    discord_js_1.GatewayIntentBits.GuildMessages,
    discord_js_1.GatewayIntentBits.MessageContent,
]);
exports.guildMessageReactionsEventsToIntent = (0, util_1.createEventsToIntent)(events.guildMessageReactionsEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessageReactions]);
exports.guildMessageTypingEventsToIntent = (0, util_1.createEventsToIntent)(events.guildMessageTypingEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessageTyping]);
exports.guildModerationEventsToIntent = (0, util_1.createEventsToIntent)(events.guildModerationEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildModeration]);
exports.guildPresencesEventsToIntent = (0, util_1.createEventsToIntent)(events.guildPresencesEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildPresences]);
exports.guildScheduledEventsEventsToIntent = (0, util_1.createEventsToIntent)(events.guildScheduledEventsEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildScheduledEvents]);
exports.guildVoiceStatesEventsToIntent = (0, util_1.createEventsToIntent)(events.guildVoiceStatesEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildVoiceStates]);
exports.guildWebhooksEventsToIntent = (0, util_1.createEventsToIntent)(events.guildWebhooksEvents, [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildWebhooks]);
exports.readyEventsToIntent = (0, util_1.createEventsToIntent)(events.readyEvents, []);
exports.interactionCreateToIntent = (0, util_1.createEventsToIntent)(events.interactionCreate, []);
exports.directMessageCreateToIntent = (0, util_1.createEventsToIntent)(events.directMessageCreate, [discord_js_1.GatewayIntentBits.DirectMessages, discord_js_1.GatewayIntentBits.MessageContent]);
exports.guildMessageCreateToIntent = (0, util_1.createEventsToIntent)(events.guildMessageCreate, [
    discord_js_1.GatewayIntentBits.Guilds,
    discord_js_1.GatewayIntentBits.GuildMessages,
    discord_js_1.GatewayIntentBits.MessageContent,
]);
exports.customEventsToIntent = __assign(__assign({}, exports.directMessageCreateToIntent), exports.guildMessageCreateToIntent);
exports.allEventsToIntent = __assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({}, exports.autoModerationConfigurationEventsToIntent), exports.autoModerationActionExecutionEventsToIntent), exports.guildEmojisAndStickersEventsToIntent), exports.guildsEventsToIntent), exports.guildInvitesEventsToIntent), exports.guildMembersEventsToIntent), exports.guildMessagesEventsToIntent), exports.guildMessageReactionsEventsToIntent), exports.guildMessageTypingEventsToIntent), exports.guildModerationEventsToIntent), exports.guildPresencesEventsToIntent), exports.guildScheduledEventsEventsToIntent), exports.guildVoiceStatesEventsToIntent), exports.guildWebhooksEventsToIntent), exports.readyEventsToIntent), exports.interactionCreateToIntent), exports.customEventsToIntent);
