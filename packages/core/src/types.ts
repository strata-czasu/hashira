import type {
  ChatInputCommandInteraction,
  ToAPIApplicationCommandOptions,
} from "discord.js";
import type { AllEventsHandling } from "./intents";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type EventsWithContext<Context extends HashiraContext<HashiraDecorators>> = {
  [K in keyof AllEventsHandling]: (
    ctx: Context,
    ...args: Parameters<AllEventsHandling[K]>
  ) => Promise<void>;
};

export type UnknownEventWithContext = (
  ctx: unknown,
  ...args: unknown[]
) => Promise<void>;

export type BaseDecorator = { [key: string]: unknown };

export interface OptionBuilder<Required extends boolean, T> {
  _: { type: If<Required, T, T | null> };
  setDescription(description: string): OptionBuilder<Required, T>;
  setRequired<NewRequired extends boolean>(
    required: NewRequired,
  ): OptionBuilder<NewRequired, T>;
  toSlashCommandOption(): ToAPIApplicationCommandOptions;
  // TODO: Should add base type like String, User, etc.
  transform(
    interaction: ChatInputCommandInteraction,
    name: string,
  ): Promise<this["_"]["type"]>;
}

export type OptionDataType<Option extends OptionBuilder<boolean, unknown>> =
  Option["_"]["type"];

export type HashiraContext<Decorators extends HashiraDecorators> = Prettify<
  Decorators["const"] & Decorators["derive"] & { state: Decorators["state"] }
>;

export type UnknownContext = {
  [key: string]: unknown;
  state: { [key: string]: unknown };
};

export type UnknownDerive = (ctx: UnknownContext) => BaseDecorator;

export type HashiraDecorators = {
  const: BaseDecorator;
  derive: BaseDecorator;
  state: BaseDecorator;
};

export type HashiraCommands = {
  [K in string]: { name: K; options: BaseDecorator };
};

export type If<Cond extends boolean, Then, Else> = Cond extends true ? Then : Else;
