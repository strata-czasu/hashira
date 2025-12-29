import type { ClientEvents } from "discord.js";
import type { CustomEventMethodName } from "./intents";

const customEventToInternalEvent = {
  directMessageCreate: "messageCreate",
  guildMessageCreate: "messageCreate",
  buttonInteractionCreate: "interactionCreate",
} as const;

type CustomEventToInternalEvent = typeof customEventToInternalEvent;

type InternalHandlerArgs<T extends CustomEventMethodName> =
  ClientEvents[CustomEventToInternalEvent[T]];

type InternalHandler<T extends CustomEventMethodName> = (
  ctx: unknown,
  ...args: InternalHandlerArgs<T>
) => Promise<void>;

const filter =
  <const T extends CustomEventMethodName>(
    predicate: (...args: InternalHandlerArgs<T>) => boolean,
    handler: InternalHandler<T>,
  ): InternalHandler<T> =>
  async (ctx, ...args) => {
    if (!predicate(...args)) return;
    await handler(ctx, ...args);
  };

type CreateTuple<T extends CustomEventMethodName> = T extends unknown
  ? [CustomEventToInternalEvent[T], InternalHandler<T>]
  : never;

export const handleCustomEvent = (
  event: CustomEventMethodName,
  handler: (...args: unknown[]) => Promise<void>,
): CreateTuple<typeof event> => {
  if (event === "directMessageCreate") {
    return [
      customEventToInternalEvent[event],
      filter<typeof event>((message) => !message.inGuild(), handler),
    ] as const;
  }

  if (event === "guildMessageCreate") {
    return [
      customEventToInternalEvent[event],
      filter<typeof event>((message) => message.inGuild(), handler),
    ] as const;
  }

  if (event === "buttonInteractionCreate") {
    return [
      customEventToInternalEvent[event],
      filter<typeof event>((itx) => itx.isButton(), handler),
    ] as const;
  }

  throw new Error(`Invalid custom event: ${event}`);
};
