import type { Prettify } from "@hashira/utils/types";
import {
  ApplicationCommandType,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  Client,
  ContextMenuCommandBuilder,
  type Interaction,
  InteractionContextType,
  type MessageContextMenuCommandInteraction,
  Partials,
  type Permissions,
  REST,
  Routes,
  type SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
  type UserContextMenuCommandInteraction,
} from "discord.js";
import { capitalize } from "es-toolkit";
import { handleCustomEvent } from "./customEvents";
import { allEventsToIntent, type EventMethodName, isCustomEvent } from "./intents";
import { Group, TopLevelSlashCommand } from "./slashCommands";
import type {
  BaseDecorator,
  EventsWithContext,
  HashiraCommands,
  HashiraContext,
  HashiraDecorators,
  UnknownContext,
  UnknownDerive,
  UnknownEventWithContext,
} from "./types";
import { mergeMap } from "./utils";

const decoratorInitBase = {
  const: {},
  derive: {},
  state: {},
};

const commandsInitBase = {};

type HashiraOptions = {
  name: string;
};

type HashiraSlashCommandOptions =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandSubcommandBuilder;

type HashiraExceptionHandler = (error: Error, interaction?: Interaction) => void;

const handleCommandConflict = (
  [a]: [HashiraSlashCommandOptions, unknown],
  [b]: [HashiraSlashCommandOptions, unknown],
) => {
  throw new Error(
    `Command ${a.name} with descriptiopn: ${a.description} conflicts with ${b.name} with description ${b.description}`,
  );
};

const handleContextMenuConflict = (
  [a]: [ContextMenuCommandBuilder, unknown],
  [b]: [ContextMenuCommandBuilder, unknown],
) => {
  throw new Error(`Context menu ${a.name} conflicts with ${b.name}`);
};

const takeIncomingOnConflict = <T>(_previous: T, current: T) => {
  return current;
};

const handleAutoCompleteConflict = (
  _a: unknown,
  _b: unknown,
  autoCompleteName: string,
) => {
  throw new Error(
    `There was a conflict with the autocomplete command ${autoCompleteName}`,
  );
};

type ExtractContext<T extends Hashira<HashiraDecorators, HashiraCommands>> =
  T extends Hashira<infer Decorators, HashiraCommands>
    ? HashiraContext<Decorators>
    : never;

class Hashira<
  Decorators extends HashiraDecorators = typeof decoratorInitBase,
  Commands extends HashiraCommands = typeof commandsInitBase,
> {
  #exceptionHandlers: Map<string, HashiraExceptionHandler>;
  #state: BaseDecorator;
  #derive: UnknownDerive[];
  #const: BaseDecorator;
  #methods: Map<EventMethodName, UnknownEventWithContext[]>;
  #commands: Map<
    string,
    [
      HashiraSlashCommandOptions,
      (
        context: UnknownContext,
        interaction: ChatInputCommandInteraction,
      ) => Promise<void>,
    ]
  >;
  #userContextMenus: Map<
    string,
    [
      ContextMenuCommandBuilder,
      (
        context: UnknownContext,
        interaction: UserContextMenuCommandInteraction,
      ) => Promise<void>,
    ]
  >;
  #messageContextMenus: Map<
    string,
    [
      ContextMenuCommandBuilder,
      (
        context: UnknownContext,
        interaction: MessageContextMenuCommandInteraction,
      ) => Promise<void>,
    ]
  >;
  #autocomplete: Map<
    string,
    (context: UnknownContext, interaction: AutocompleteInteraction) => Promise<void>
  >;
  #dependencies: string[];
  #name: string;

  constructor(options: HashiraOptions) {
    this.#derive = [];
    this.#state = {};
    this.#const = {};
    this.#methods = new Map();
    this.#commands = new Map();
    this.#userContextMenus = new Map();
    this.#messageContextMenus = new Map();
    this.#autocomplete = new Map();
    this.#exceptionHandlers = new Map();
    this.#dependencies = [options.name];
    this.#name = options.name;
  }

  const<const U extends BaseDecorator>(
    remap: (ctx: Decorators["const"]) => U,
  ): Hashira<
    {
      const: U;
      derive: Decorators["derive"];
      state: Decorators["state"];
    },
    Commands
  >;

  const<const T extends string, const U>(
    name: T,
    value: U,
  ): Hashira<
    {
      const: Prettify<Decorators["const"] & { [key in T]: U }>;
      derive: Decorators["derive"];
      state: Decorators["state"];
    },
    Commands
  >;

  // biome-ignore lint/complexity/noBannedTypes: Cannot use other more specific type here
  const(name: string | Function, value?: unknown) {
    if (typeof name === "string") {
      this.#const[name] = value;
      return this;
    }

    this.#const = name(this.#const);

    return this;
  }

  derive<const T extends BaseDecorator>(
    transform: (ctx: HashiraContext<Decorators>) => T,
  ): Hashira<
    {
      const: Decorators["const"];
      derive: Prettify<Decorators["derive"] & T>;
      state: Decorators["state"];
    },
    Commands
  > {
    this.#derive.push(transform as unknown as UnknownDerive);

    return this as unknown as ReturnType<typeof this.derive<T>>;
  }

  state<const T extends string, U>(
    name: T,
    value: U,
  ): Hashira<
    {
      const: Decorators["const"];
      derive: Decorators["derive"];
      state: Prettify<Decorators["state"] & { [key in T]: U }>;
    },
    Commands
  > {
    this.#state[name] = value;

    return this as unknown as ReturnType<typeof this.state<T, U>>;
  }

  tapState<T extends keyof Decorators["state"]>(
    name: T,
    tapper: (value: Decorators["state"][T]) => void,
  ): this {
    tapper((this.#state as Decorators["state"])[name]);
    return this;
  }

  use<NewHashira extends Hashira>(
    instance: NewHashira,
  ): NewHashira extends Hashira<infer NewDecorators, infer NewCommands>
    ? Hashira<
        {
          const: Prettify<Decorators["const"] & NewDecorators["const"]>;
          derive: Prettify<Decorators["derive"] & NewDecorators["derive"]>;
          state: Prettify<Decorators["state"] & NewDecorators["state"]>;
        },
        Prettify<Commands & NewCommands>
      >
    : never {
    // TODO: Handle dependencies as trees? So we can detect already added dependencies
    if (this.#dependencies.includes(instance.#name)) {
      return this as unknown as ReturnType<typeof this.use<NewHashira>>;
    }

    this.#const = { ...this.#const, ...instance.#const };
    this.#derive = [...this.#derive, ...instance.#derive];
    this.#state = { ...this.#state, ...instance.#state };
    this.#exceptionHandlers = mergeMap(
      takeIncomingOnConflict,
      this.#exceptionHandlers,
      instance.#exceptionHandlers,
    );
    this.#methods = mergeMap((a, b) => [...a, ...b], this.#methods, instance.#methods);
    this.#commands = mergeMap(
      handleCommandConflict,
      this.#commands,
      instance.#commands,
    );
    this.#userContextMenus = mergeMap(
      handleContextMenuConflict,
      this.#userContextMenus,
      instance.#userContextMenus,
    );
    this.#messageContextMenus = mergeMap(
      handleContextMenuConflict,
      this.#messageContextMenus,
      instance.#messageContextMenus,
    );
    this.#autocomplete = mergeMap(
      handleAutoCompleteConflict,
      this.#autocomplete,
      instance.#autocomplete,
    );

    this.#dependencies.push(instance.#name);

    return this as unknown as ReturnType<typeof this.use<NewHashira>>;
  }

  context(): HashiraContext<Decorators> {
    const ctx = {
      state: this.#state,
      ...this.#const,
    } as HashiraContext<Decorators>;

    for (const derive of this.#derive) {
      Object.assign(ctx, derive(ctx));
    }

    return ctx;
  }

  handle<const MethodName extends EventMethodName>(
    methodName: MethodName,
    method: EventsWithContext<HashiraContext<Decorators>>[MethodName],
  ): Hashira<Decorators, Commands> {
    const methods = this.#methods.get(methodName) ?? [];

    this.#methods.set(methodName, [...methods, method as UnknownEventWithContext]);

    return this;
  }

  command<
    T extends string,
    U extends TopLevelSlashCommand<
      HashiraContext<Decorators>,
      { HasDescription: true; HasHandler: true },
      BaseDecorator
    >,
  >(
    name: T,
    init: (builder: TopLevelSlashCommand<HashiraContext<Decorators>>) => U,
  ): U extends TopLevelSlashCommand<
    HashiraContext<Decorators>,
    { HasDescription: true; HasHandler: true },
    infer Options
  >
    ? Hashira<Decorators, Prettify<Commands & { [key in T]: { options: Options } }>>
    : never {
    const command = init(new TopLevelSlashCommand());
    const builder = command.toSlashCommandBuilder().setName(name);
    const handler = command.toHandler();
    this.#commands.set(name, [builder, handler]);
    const autocomplete = command.toAutocomplete();
    if (autocomplete) this.#autocomplete.set(name, autocomplete);
    return this as unknown as ReturnType<typeof this.command<T, U>>;
  }

  group<
    T extends string,
    U extends Group<
      HashiraContext<Decorators>,
      { HasDescription: true; TopLevel: true },
      BaseDecorator
    >,
  >(
    name: T,
    init: (builder: Group<HashiraContext<Decorators>>) => U,
  ): Hashira<Decorators, Commands> {
    const group = init(new Group(true));
    const builder = group.toSlashCommandBuilder().setName(name);
    this.#commands.set(name, [builder, group.toHandler()]);
    const autocomplete = group.toAutocomplete();
    if (autocomplete) this.#autocomplete.set(name, autocomplete);
    return this;
  }

  userContextMenu<T extends string>(
    name: T,
    permissions: Permissions | bigint | number | null | undefined,
    handler: (
      ctx: HashiraContext<Decorators>,
      interaction: UserContextMenuCommandInteraction,
    ) => Promise<void>,
  ): Hashira<Decorators, Commands> {
    const builder = new ContextMenuCommandBuilder()
      .setContexts(InteractionContextType.BotDM)
      .setDefaultMemberPermissions(permissions)
      .setType(ApplicationCommandType.User)
      .setName(name)
      .setNameLocalization("en-US", capitalize(name));
    this.#userContextMenus.set(name, [
      builder,
      handler as unknown as (
        ctx: UnknownContext,
        interaction: UserContextMenuCommandInteraction,
      ) => Promise<void>,
    ]);
    return this as unknown as ReturnType<typeof this.userContextMenu<T>>;
  }

  messageContextMenu<T extends string>(
    name: T,
    permissions: Permissions | bigint | number | null | undefined,
    handler: (
      ctx: HashiraContext<Decorators>,
      interaction: MessageContextMenuCommandInteraction,
    ) => Promise<void>,
  ): Hashira<Decorators, Commands> {
    const builder = new ContextMenuCommandBuilder()
      .setContexts(InteractionContextType.BotDM)
      .setDefaultMemberPermissions(permissions)
      .setType(ApplicationCommandType.Message)
      .setName(name)
      .setNameLocalization("en-US", capitalize(name));
    this.#messageContextMenus.set(name, [
      builder,
      handler as unknown as (
        ctx: UnknownContext,
        interaction: MessageContextMenuCommandInteraction,
      ) => Promise<void>,
    ]);
    return this as unknown as ReturnType<typeof this.messageContextMenu<T>>;
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const command = this.#commands.get(interaction.commandName);

    if (!command) return;
    const [_, handler] = command;

    try {
      await handler(this.context(), interaction);
    } catch (error) {
      if (error instanceof Error) this.handleException(error, interaction);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: "Ephemeral",
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: "Ephemeral",
        });
      }
    }
  }

  private async handleUserContextMenu(interaction: UserContextMenuCommandInteraction) {
    const contextMenu = this.#userContextMenus.get(interaction.commandName);

    if (!contextMenu) return;
    const [_, handler] = contextMenu;

    try {
      await handler(this.context(), interaction);
    } catch (error) {
      if (error instanceof Error) this.handleException(error, interaction);
    }
  }

  private async handleMessageContextMenu(
    interaction: MessageContextMenuCommandInteraction,
  ) {
    const contextMenu = this.#messageContextMenus.get(interaction.commandName);

    if (!contextMenu) return;
    const [_, handler] = contextMenu;

    try {
      await handler(this.context(), interaction);
    } catch (error) {
      if (error instanceof Error) this.handleException(error, interaction);
    }
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction) {
    const handler = this.#autocomplete.get(interaction.commandName);

    if (!handler) return;

    try {
      await handler(this.context(), interaction);
    } catch (error) {
      if (error instanceof Error) this.handleException(error, interaction);
      await interaction.respond([]);
    }
  }

  async loadHandlers(discordClient: Client) {
    for (const [event, handlers] of this.#methods) {
      for (const rawHandler of handlers) {
        if (isCustomEvent(event)) {
          const [discordEvent, handler] = handleCustomEvent(event, rawHandler);
          discordClient.on(discordEvent, (...args) =>
            (handler as UnknownEventWithContext)(this.context(), ...args),
          );
        } else {
          discordClient.on(event, (...args) => rawHandler(this.context(), ...args));
        }
      }
    }

    discordClient.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) return this.handleCommand(interaction);
      if (interaction.isUserContextMenuCommand())
        return this.handleUserContextMenu(interaction);
      if (interaction.isMessageContextMenuCommand())
        return this.handleMessageContextMenu(interaction);
      if (interaction.isAutocomplete()) return this.handleAutocomplete(interaction);
    });

    discordClient.on("error", (error) => this.handleException(error));
  }

  addExceptionHandler(name: string, handler: HashiraExceptionHandler) {
    this.#exceptionHandlers.set(name, handler);

    return this;
  }

  private handleException(error: Error, interaction?: Interaction) {
    for (const handler of this.#exceptionHandlers.values()) {
      handler(error, interaction);
    }
  }

  async start(token: string) {
    const intents = [
      ...new Set(
        [...this.#methods.keys()].flatMap((event) => allEventsToIntent[event]),
      ),
    ];

    const discordClient = new Client({
      intents,
      allowedMentions: { repliedUser: true },
      // NOTE: This is required to receive DMs
      partials: [Partials.Channel],
    });

    this.loadHandlers(discordClient);

    await discordClient.login(token);
  }

  async registerCommands(token: string, guildIds: string[], clientId: string) {
    console.log(`Registering application commands for ${guildIds.join(", ")}.`);
    await Promise.all(
      guildIds.map((guildId) => this.registerGuildCommands(token, guildId, clientId)),
    );
  }

  async registerGuildCommands(token: string, guildId: string, clientId: string) {
    const rest = new REST().setToken(token);
    const commands = [...this.#commands.values()].map(([builder]) => builder.toJSON());
    const contextMenus = [
      ...this.#userContextMenus.values(),
      ...this.#messageContextMenus.values(),
    ].map(([builder]) => builder.toJSON());

    try {
      const currentCommands = (await rest.get(
        Routes.applicationGuildCommands(clientId, guildId),
      )) as { id: string; name: string }[];

      const commandsToDelete = currentCommands
        .filter(
          (command) =>
            !this.#commands.has(command.name) &&
            !this.#userContextMenus.has(command.name),
        )
        .map(({ id }) => Routes.applicationGuildCommand(clientId, guildId, id));

      await Promise.all(commandsToDelete.map((route) => rest.delete(route)));

      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [...commands, ...contextMenus],
      });

      // TODO)) Log how much commands and context menus were registered
      console.log(`Successfully registered application commands for guild ${guildId}.`);
    } catch (error) {
      if (error instanceof Error) console.error(error);
      console.error(error);
    }
  }
}

export { ConfirmationDialog, waitForConfirmation } from "./confirmationDialog";
export { PaginatedView } from "./paginatedView";
export { Hashira, decoratorInitBase };
export type { BaseDecorator, ExtractContext, HashiraContext, HashiraDecorators };
