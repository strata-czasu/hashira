import type { ClientEvents } from "discord.js";
import { match } from "ts-pattern";
import type { CustomEventMethodName } from "./intents";

const customEventToInternalEvent = {
  directMessageCreate: "messageCreate",
  guildMessageCreate: "messageCreate",
} as const;

type CustomEventToInternalEvent = typeof customEventToInternalEvent;

type InternalHandlerArgs<T extends CustomEventMethodName> =
  ClientEvents[CustomEventToInternalEvent[T]];

type InternalHandler<T extends CustomEventMethodName> = (
  ctx: unknown,
  ...args: InternalHandlerArgs<T>
) => Promise<void>;

const filter =
  <T extends CustomEventMethodName>(
    predicate: (...args: InternalHandlerArgs<T>) => boolean,
    handler: InternalHandler<T>,
  ): InternalHandler<T> =>
  async (ctx, ...args) => {
    if (!predicate(...args)) return;
    await handler(ctx, ...args);
  };

export const handleCustomEvent = (
  event: CustomEventMethodName,
  handler: (...args: unknown[]) => Promise<void>,
): readonly [CustomEventToInternalEvent[typeof event], InternalHandler<typeof event>] =>
  match(event)
    .with("directMessageCreate", (value) => {
      return [
        customEventToInternalEvent[value],
        filter((message) => !message.inGuild(), handler),
      ] as const;
    })
    .with(
      "guildMessageCreate",
      (value) =>
        [
          customEventToInternalEvent[value],
          filter((message) => message.inGuild(), handler),
        ] as const,
    )
    .exhaustive();
