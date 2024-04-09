import type { ClientEvents } from "discord.js";
import { allCustomEvents } from "./events";
import { allEventsToIntent, type customEventsToIntent } from "./eventsToIntent";

export type EventMethodName = keyof typeof allEventsToIntent;
export type CustomEventMethodName = keyof typeof customEventsToIntent;
export type InternalEventMethodName = Exclude<EventMethodName, CustomEventMethodName> &
  keyof ClientEvents;
export type { AllEventsHandling, CustomEventsHandling } from "./eventsHandling";
export { allEventsToIntent };

export const isCustomEvent = (event: EventMethodName): event is CustomEventMethodName =>
  (allCustomEvents as unknown as string[]).includes(event);
