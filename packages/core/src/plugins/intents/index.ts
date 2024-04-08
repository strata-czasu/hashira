import { GatewayIntentBits } from "discord.js";

import {
	type EventsToHandling,
	createEventsToDefaultHandling,
	createEventsToIntent,
} from "./util";

const autoModerationConfigurationEvents = [
	"autoModerationRuleCreate",
	"autoModerationRuleUpdate",
	"autoModerationRuleDelete",
] as const;

const guildEmojisAndStickersEvents = [
	"emojiCreate",
	"emojiDelete",
	"emojiUpdate",
	"stickerCreate",
	"stickerDelete",
	"stickerUpdate",
] as const;

const guildsEvents = [
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
] as const;

export const guildMessagesEvents = [
	"messageCreate",
	"messageUpdate",
	"messageDelete",
	"messageDeleteBulk",
] as const;

const guildMessageReactionsEvents = [
	"messageReactionAdd",
	"messageReactionRemove",
	"messageReactionRemoveAll",
	"messageReactionRemoveEmoji",
] as const;

const guildMembersEvents = [
	"guildMemberAdd",
	"guildMemberUpdate",
	"guildMemberRemove",
] as const;

const guildModerationEvents = [
	"guildAuditLogEntryCreate",
	"guildBanAdd",
	"guildBanRemove",
] as const;

const guildScheduledEventsEvents = [
	"guildScheduledEventCreate",
	"guildScheduledEventUpdate",
	"guildScheduledEventDelete",
	"guildScheduledEventUserAdd",
	"guildScheduledEventUserRemove",
] as const;

const autoModerationActionExecutionEvents = ["autoModerationActionExecution"] as const;

const guildIntegrationsEvents = ["guildIntegrationsUpdate"] as const;
const guildMessageTypingEvents = ["typingStart"] as const;
const guildPresencesEvents = ["presenceUpdate"] as const;
const guildVoiceStatesEvents = ["voiceStateUpdate"] as const;
const guildWebhooksEvents = ["webhooksUpdate"] as const;
const guildInvitesEvents = ["inviteCreate", "inviteDelete"] as const;

export const allEvents = [
	...autoModerationConfigurationEvents,
	...autoModerationActionExecutionEvents,
	...guildEmojisAndStickersEvents,
	...guildsEvents,
	...guildInvitesEvents,
	...guildMembersEvents,
	...guildMessagesEvents,
	...guildMessageReactionsEvents,
	...guildMessageTypingEvents,
	...guildModerationEvents,
	...guildPresencesEvents,
	...guildScheduledEventsEvents,
	...guildVoiceStatesEvents,
	...guildWebhooksEvents,
] as const;

export type AutoModerationConfigurationHandling = EventsToHandling<
	typeof autoModerationConfigurationEvents
>;

export type AutoModerationActionExecutionHandling = EventsToHandling<
	typeof autoModerationActionExecutionEvents
>;

export type GuildEmojisAndStickersHandling = EventsToHandling<
	typeof guildEmojisAndStickersEvents
>;

export type GuildIntegrationsHandling = EventsToHandling<
	typeof guildIntegrationsEvents
>;

export type GuildInvitesHandling = EventsToHandling<typeof guildInvitesEvents>;
export type GuildMembersHandling = EventsToHandling<typeof guildMembersEvents>;
export type GuildsHandling = EventsToHandling<typeof guildsEvents>;

export type GuildMessageReactionsHandling = EventsToHandling<
	typeof guildMessageReactionsEvents
>;

export type GuildMessageTypingHandling = EventsToHandling<
	typeof guildMessageTypingEvents
>;

export type GuildModerationHandling = EventsToHandling<typeof guildModerationEvents>;

export type GuildPresencesHandling = EventsToHandling<typeof guildPresencesEvents>;

export type GuildScheduledEventsHandling = EventsToHandling<
	typeof guildScheduledEventsEvents
>;

export type GuildVoiceStatesHandling = EventsToHandling<typeof guildVoiceStatesEvents>;

export type GuildWebhooksHandling = EventsToHandling<typeof guildWebhooksEvents>;

export type GuildMessagesHandling = EventsToHandling<typeof guildMessagesEvents>;

export type AllEventsHandling = AutoModerationConfigurationHandling &
	AutoModerationActionExecutionHandling &
	GuildEmojisAndStickersHandling &
	GuildsHandling &
	GuildInvitesHandling &
	GuildMembersHandling &
	GuildMessagesHandling &
	GuildMessageReactionsHandling &
	GuildMessageTypingHandling &
	GuildModerationHandling &
	GuildPresencesHandling &
	GuildScheduledEventsHandling &
	GuildVoiceStatesHandling &
	GuildWebhooksHandling;

export const autoModerationConfigurationDefaultHandling = createEventsToDefaultHandling(
	autoModerationConfigurationEvents,
);

export const guildEventsToDefaultHandling = createEventsToDefaultHandling(guildsEvents);

export const autoModerationActionExecutionDefaultHandling =
	createEventsToDefaultHandling(autoModerationActionExecutionEvents);

export const guildIntegrationsDefaultHandling = createEventsToDefaultHandling(
	guildIntegrationsEvents,
);

export const guildMessageReactionsDefaultHandling = createEventsToDefaultHandling(
	guildMessageReactionsEvents,
);

export const guildInvitesDefaultHandling =
	createEventsToDefaultHandling(guildInvitesEvents);

export const guildmembersDefaultHandling =
	createEventsToDefaultHandling(guildMembersEvents);

export const guildMessagesDefaultHandling =
	createEventsToDefaultHandling(guildMessagesEvents);

export const guildEmojisAndStickersDefaultHandling = createEventsToDefaultHandling(
	guildEmojisAndStickersEvents,
);

export const guildMessageTypingDefaultHandling = createEventsToDefaultHandling(
	guildMessageTypingEvents,
);

export const guildModerationDefaultHandling =
	createEventsToDefaultHandling(guildModerationEvents);

export const guildPresencesEventsToDefaultHandling =
	createEventsToDefaultHandling(guildPresencesEvents);

export const guildScheduledEventsDefaultHandling = createEventsToDefaultHandling(
	guildScheduledEventsEvents,
);

export const guildVoiceStatesDefaultHandling =
	createEventsToDefaultHandling(guildVoiceStatesEvents);

export const guildWebhooksDefaultHandling =
	createEventsToDefaultHandling(guildWebhooksEvents);

export const allEventsToDefaultHandling = {
	...autoModerationConfigurationDefaultHandling,
	...autoModerationActionExecutionDefaultHandling,
	...guildEmojisAndStickersDefaultHandling,
	...guildEventsToDefaultHandling,
	...guildInvitesDefaultHandling,
	...guildmembersDefaultHandling,
	...guildMessagesDefaultHandling,
	...guildMessageReactionsDefaultHandling,
	...guildMessageTypingDefaultHandling,
	...guildModerationDefaultHandling,
	...guildPresencesEventsToDefaultHandling,
	...guildScheduledEventsDefaultHandling,
	...guildVoiceStatesDefaultHandling,
	...guildWebhooksDefaultHandling,
} as const;

export const guildEmojisAndStickersEventsToIntent = createEventsToIntent(
	guildEmojisAndStickersEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers],
);

export const autoModerationActionExecutionEventsToIntent = createEventsToIntent(
	autoModerationActionExecutionEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageTyping],
);

export const guildIntegrationsEventsToIntent = createEventsToIntent(
	guildIntegrationsEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildIntegrations],
);

export const guildsEventsToIntent = createEventsToIntent(guildsEvents, [
	GatewayIntentBits.Guilds,
]);

export const autoModerationConfigurationEventsToIntent = createEventsToIntent(
	autoModerationConfigurationEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.AutoModerationConfiguration],
);

export const guildInvitesEventsToIntent = createEventsToIntent(guildInvitesEvents, [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildInvites,
]);

export const guildMembersEventsToIntent = createEventsToIntent(guildMembersEvents, [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
]);

export const guildMessagesEventsToIntent = createEventsToIntent(guildMessagesEvents, [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
]);

export const guildMessageReactionsEventsToIntent = createEventsToIntent(
	guildMessageReactionsEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions],
);

export const guildMessageTypingEventsToIntent = createEventsToIntent(
	guildMessageTypingEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageTyping],
);

export const guildModerationEventsToIntent = createEventsToIntent(
	guildModerationEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildModeration],
);

export const guildPresencesEventsToIntent = createEventsToIntent(guildPresencesEvents, [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildPresences,
]);

export const guildScheduledEventsEventsToIntent = createEventsToIntent(
	guildScheduledEventsEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
);

export const guildVoiceStatesEventsToIntent = createEventsToIntent(
	guildVoiceStatesEvents,
	[GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
);

export const guildWebhooksEventsToIntent = createEventsToIntent(guildWebhooksEvents, [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildWebhooks,
]);

export const allEventsToIntent = {
	...autoModerationConfigurationEventsToIntent,
	...autoModerationActionExecutionEventsToIntent,
	...guildEmojisAndStickersEventsToIntent,
	...guildsEventsToIntent,
	...guildInvitesEventsToIntent,
	...guildMembersEventsToIntent,
	...guildMessagesEventsToIntent,
	...guildMessageReactionsEventsToIntent,
	...guildMessageTypingEventsToIntent,
	...guildModerationEventsToIntent,
	...guildPresencesEventsToIntent,
	...guildScheduledEventsEventsToIntent,
	...guildVoiceStatesEventsToIntent,
	...guildWebhooksEventsToIntent,
} as const;

export type EventMethodName = keyof typeof allEventsToIntent;
