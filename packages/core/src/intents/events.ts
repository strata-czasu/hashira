export const autoModerationConfigurationEvents = [
  "autoModerationRuleCreate",
  "autoModerationRuleUpdate",
  "autoModerationRuleDelete",
] as const;

export const guildEmojisAndStickersEvents = [
  "emojiCreate",
  "emojiDelete",
  "emojiUpdate",
  "stickerCreate",
  "stickerDelete",
  "stickerUpdate",
] as const;

export const guildsEvents = [
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

export const guildMessageReactionsEvents = [
  "messageReactionAdd",
  "messageReactionRemove",
  "messageReactionRemoveAll",
  "messageReactionRemoveEmoji",
] as const;

export const guildMembersEvents = [
  "guildMemberAdd",
  "guildMemberAvailable",
  "guildMemberUpdate",
  "guildMemberRemove",
] as const;

export const guildModerationEvents = [
  "guildAuditLogEntryCreate",
  "guildBanAdd",
  "guildBanRemove",
] as const;

export const guildScheduledEventsEvents = [
  "guildScheduledEventCreate",
  "guildScheduledEventUpdate",
  "guildScheduledEventDelete",
  "guildScheduledEventUserAdd",
  "guildScheduledEventUserRemove",
] as const;

export const autoModerationActionExecutionEvents = [
  "autoModerationActionExecution",
] as const;

export const guildIntegrationsEvents = ["guildIntegrationsUpdate"] as const;
export const guildMessageTypingEvents = ["typingStart"] as const;
export const guildPresencesEvents = ["presenceUpdate"] as const;
export const guildVoiceStatesEvents = ["voiceStateUpdate"] as const;
export const guildWebhooksEvents = ["webhooksUpdate"] as const;
export const guildInvitesEvents = ["inviteCreate", "inviteDelete"] as const;
export const readyEvents = ["ready", "shardReady"] as const;
export const interactionCreate = ["interactionCreate"] as const;

export const directMessageCreate = ["directMessageCreate"] as const;
export const guildMessageCreate = ["guildMessageCreate"] as const;
export const allCustomEvents = [...directMessageCreate, ...guildMessageCreate] as const;

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
  ...readyEvents,
  ...interactionCreate,
  ...allCustomEvents,
] as const;
