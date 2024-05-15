import { GatewayIntentBits } from "discord.js";
import * as events from "./events";
import { createEventsToIntent } from "./util";

export const guildEmojisAndStickersEventsToIntent = createEventsToIntent(
  events.guildEmojisAndStickersEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers],
);

export const autoModerationActionExecutionEventsToIntent = createEventsToIntent(
  events.autoModerationActionExecutionEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageTyping],
);

export const guildIntegrationsEventsToIntent = createEventsToIntent(
  events.guildIntegrationsEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildIntegrations],
);

export const guildsEventsToIntent = createEventsToIntent(events.guildsEvents, [
  GatewayIntentBits.Guilds,
]);

export const autoModerationConfigurationEventsToIntent = createEventsToIntent(
  events.autoModerationConfigurationEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.AutoModerationConfiguration],
);

export const guildInvitesEventsToIntent = createEventsToIntent(
  events.guildInvitesEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildInvites],
);

export const guildMembersEventsToIntent = createEventsToIntent(
  events.guildMembersEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
);

export const guildMessagesEventsToIntent = createEventsToIntent(
  events.guildMessagesEvents,
  [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
);

export const guildMessageReactionsEventsToIntent = createEventsToIntent(
  events.guildMessageReactionsEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions],
);

export const guildMessageTypingEventsToIntent = createEventsToIntent(
  events.guildMessageTypingEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageTyping],
);

export const guildModerationEventsToIntent = createEventsToIntent(
  events.guildModerationEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildModeration],
);

export const guildPresencesEventsToIntent = createEventsToIntent(
  events.guildPresencesEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
);

export const guildScheduledEventsEventsToIntent = createEventsToIntent(
  events.guildScheduledEventsEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
);

export const guildVoiceStatesEventsToIntent = createEventsToIntent(
  events.guildVoiceStatesEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
);

export const guildWebhooksEventsToIntent = createEventsToIntent(
  events.guildWebhooksEvents,
  [GatewayIntentBits.Guilds, GatewayIntentBits.GuildWebhooks],
);

export const readyEventsToIntent = createEventsToIntent(events.readyEvents, []);

export const directMessageCreateToIntent = createEventsToIntent(
  events.directMessageCreate,
  [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
);

export const guildMessageCreateToIntent = createEventsToIntent(
  events.guildMessageCreate,
  [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
);

export const customEventsToIntent = {
  ...directMessageCreateToIntent,
  ...guildMessageCreateToIntent,
};

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
  ...readyEventsToIntent,
  ...customEventsToIntent,
} as const;
