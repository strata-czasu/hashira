import * as events from "./events";
import { createEventsToDefaultHandling } from "./util";
// TODO: seems like there are no use cases for this file, consider removing it
export const autoModerationConfigurationDefaultHandling = createEventsToDefaultHandling(
	events.autoModerationConfigurationEvents,
);

export const guildEventsToDefaultHandling = createEventsToDefaultHandling(
	events.guildsEvents,
);

export const autoModerationActionExecutionDefaultHandling =
	createEventsToDefaultHandling(events.autoModerationActionExecutionEvents);

export const guildIntegrationsDefaultHandling = createEventsToDefaultHandling(
	events.guildIntegrationsEvents,
);

export const guildMessageReactionsDefaultHandling = createEventsToDefaultHandling(
	events.guildMessageReactionsEvents,
);

export const guildInvitesDefaultHandling = createEventsToDefaultHandling(
	events.guildInvitesEvents,
);

export const guildmembersDefaultHandling = createEventsToDefaultHandling(
	events.guildMembersEvents,
);

export const guildMessagesDefaultHandling = createEventsToDefaultHandling(
	events.guildMessagesEvents,
);

export const guildEmojisAndStickersDefaultHandling = createEventsToDefaultHandling(
	events.guildEmojisAndStickersEvents,
);

export const guildMessageTypingDefaultHandling = createEventsToDefaultHandling(
	events.guildMessageTypingEvents,
);

export const guildModerationDefaultHandling = createEventsToDefaultHandling(
	events.guildModerationEvents,
);

export const guildPresencesEventsToDefaultHandling = createEventsToDefaultHandling(
	events.guildPresencesEvents,
);

export const guildScheduledEventsDefaultHandling = createEventsToDefaultHandling(
	events.guildScheduledEventsEvents,
);

export const guildVoiceStatesDefaultHandling = createEventsToDefaultHandling(
	events.guildVoiceStatesEvents,
);

export const guildWebhooksDefaultHandling = createEventsToDefaultHandling(
	events.guildWebhooksEvents,
);

export const readyDefaultHandling = createEventsToDefaultHandling(events.readyEvents);

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
	...readyDefaultHandling,
} as const;
