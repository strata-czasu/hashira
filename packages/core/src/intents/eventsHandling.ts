import type { Message } from "discord.js";
import type * as events from "./events";
import type { EventsToHandling } from "./util";

export type AutoModerationConfigurationHandling = EventsToHandling<
  typeof events.autoModerationConfigurationEvents
>;

export type AutoModerationActionExecutionHandling = EventsToHandling<
  typeof events.autoModerationActionExecutionEvents
>;

export type GuildEmojisAndStickersHandling = EventsToHandling<
  typeof events.guildEmojisAndStickersEvents
>;

export type GuildIntegrationsHandling = EventsToHandling<
  typeof events.guildIntegrationsEvents
>;

export type GuildInvitesHandling = EventsToHandling<typeof events.guildInvitesEvents>;
export type GuildMembersHandling = EventsToHandling<typeof events.guildMembersEvents>;
export type GuildsHandling = EventsToHandling<typeof events.guildsEvents>;

export type GuildMessageReactionsHandling = EventsToHandling<
  typeof events.guildMessageReactionsEvents
>;

export type GuildMessageTypingHandling = EventsToHandling<
  typeof events.guildMessageTypingEvents
>;

export type GuildModerationHandling = EventsToHandling<
  typeof events.guildModerationEvents
>;

export type GuildPresencesHandling = EventsToHandling<
  typeof events.guildPresencesEvents
>;

export type GuildScheduledEventsHandling = EventsToHandling<
  typeof events.guildScheduledEventsEvents
>;

export type GuildVoiceStatesHandling = EventsToHandling<
  typeof events.guildVoiceStatesEvents
>;

export type GuildWebhooksHandling = EventsToHandling<typeof events.guildWebhooksEvents>;

export type GuildMessagesHandling = EventsToHandling<typeof events.guildMessagesEvents>;

export type ReadyHandling = EventsToHandling<typeof events.readyEvents>;

export type DirectMessageCreateHandling = {
  directMessageCreate: (message: Message<false>) => Promise<void>;
};

export type GuildMessageCreateHandling = {
  guildMessageCreate: (message: Message<true>) => Promise<void>;
};

export type CustomEventsHandling = DirectMessageCreateHandling &
  GuildMessageCreateHandling;

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
  GuildWebhooksHandling &
  ReadyHandling &
  CustomEventsHandling;
