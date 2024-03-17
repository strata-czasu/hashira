import { type ClientEvents, GatewayIntentBits } from "discord.js";

export type EventsToHandling<Events extends readonly (keyof ClientEvents)[]> = {
	[K in Events[number]]: (...args: ClientEvents[K]) => Promise<void>;
};

export type EventsToDefaultHandling<Events extends readonly (keyof ClientEvents)[]> = {
	[K in Events[number]]: () => Promise<void>;
};

export const createEventsToDefaultHandling = <
	Events extends readonly (keyof ClientEvents)[],
>(
	events: Events,
): EventsToDefaultHandling<Events> =>
	Object.fromEntries(
		events.map((event) => [event, async () => {}] as const),
	) as EventsToDefaultHandling<Events>;

export type EventsToIntents<
	Events extends readonly (keyof ClientEvents)[] | readonly string[],
	Intents extends GatewayIntentBits[],
> = {
	[K in Events[number]]: Intents;
};

export const createEventsToIntent = <
	const Events extends readonly (keyof ClientEvents)[] | readonly string[],
	const Intents extends GatewayIntentBits[],
>(
	events: Events,
	intents: Intents,
): EventsToIntents<Events, Intents> =>
	Object.fromEntries(
		events.map((event) => [event, intents] as const),
	) as EventsToIntents<Events, Intents>;
