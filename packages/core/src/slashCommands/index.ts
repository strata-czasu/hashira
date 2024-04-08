import {
  ChatInputCommandInteraction,
  type Permissions,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import type {
  BaseDecorator,
  HashiraContext,
  HashiraDecorators,
  If,
  OptionBuilder,
  OptionDataType,
  Prettify,
  UnknownContext,
} from "../types";
import { AttachmentOptionBuilder } from "./attachmentOptionBuilder";
import { RoleOptionBuilder } from "./roleOptionBuilder";
import { StringOptionBuilder } from "./stringOptionBuilder";
import { UserOptionBuilder } from "./userOptionBuilder";

const optionsInitBase = {};

type UnknownCommandHandler = (
  ctx: UnknownContext,
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

interface Handlers extends Record<string, Handlers | UnknownCommandHandler> {}

interface GroupSettings {
  HasDescription: boolean;
  TopLevel: boolean;
}

const groupSettingsInitBase: GroupSettings = {
  HasDescription: false,
  TopLevel: true,
};

export class Group<
  const Context extends HashiraContext<HashiraDecorators>,
  const Settings extends GroupSettings = typeof groupSettingsInitBase,
  const Commands extends BaseDecorator = typeof optionsInitBase,
> {
  // Enforce nominal typing
  protected declare readonly nominal: [Settings, Commands];
  protected readonly _topLevel: Settings["TopLevel"];
  #builder: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder;
  #handlers: Handlers = {};

  constructor(topLevel: Settings["TopLevel"]) {
    this._topLevel = topLevel;
    if (this._topLevel) {
      this.#builder = new SlashCommandBuilder();
    } else {
      this.#builder = new SlashCommandSubcommandGroupBuilder();
    }
  }

  setDescription(
    description: string,
  ): Group<Context, { HasDescription: true; TopLevel: true }, Commands> {
    this.#builder.setDescription(description);
    return this as unknown as ReturnType<typeof this.setDescription>;
  }

  setDefaultMemberPermissions(
    permission: Permissions | number | bigint,
  ): If<Settings["TopLevel"], Group<Context, Settings, Commands>, never> {
    if (!(this.#builder instanceof SlashCommandBuilder))
      throw new Error("Cannot set default permission on a non-top-level group");
    this.#builder.setDefaultMemberPermissions(permission);
    return this as unknown as ReturnType<typeof this.setDefaultMemberPermissions>;
  }

  setDMPermission(
    enabled: boolean,
  ): If<Settings["TopLevel"], Group<Context, Settings, Commands>, never> {
    if (!(this.#builder instanceof SlashCommandBuilder))
      throw new Error("Cannot set DM permission on a non-top-level group");
    this.#builder.setDMPermission(enabled);
    return this as unknown as ReturnType<typeof this.setDMPermission>;
  }

  addCommand<
    const T extends string,
    const U extends SlashCommand<
      Context,
      { HasHandler: true; HasDescription: boolean }
    >,
  >(
    name: T,
    input: (builder: SlashCommand<Context>) => U,
  ): Group<Context, Settings, Prettify<Commands & { [key in T]: U }>> {
    const command = input(new SlashCommand());
    const commandBuilder = command.toSlashCommandBuilder().setName(name);
    this.#builder.addSubcommand(commandBuilder);
    this.#handlers[name] = command.toHandler();
    return this as unknown as ReturnType<typeof this.addCommand<T, U>>;
  }

  addGroup<
    const T extends string,
    const U extends Group<
      Context,
      { HasDescription: true; TopLevel: false },
      BaseDecorator
    >,
  >(
    name: T,
    input: (builder: Group<Context, { HasDescription: false; TopLevel: false }>) => U,
  ): If<
    Settings["TopLevel"],
    Group<Context, Settings, Prettify<Commands & { [key in T]: U }>>,
    never
  > {
    if (!this._topLevel) throw new Error("Cannot add a group to a non-top-level group");
    if (!(this.#builder instanceof SlashCommandBuilder))
      throw new Error("Cannot add a group to a non-top-level group");
    const group = input(new Group(false));
    const builder = group.toSlashCommandBuilder().setName(name);
    this.#builder.addSubcommandGroup(builder);
    this.#handlers[name] = group.#handlers;
    return this as unknown as ReturnType<typeof this.addGroup<T, U>>;
  }

  toSlashCommandBuilder(): If<
    Settings["TopLevel"],
    SlashCommandBuilder,
    SlashCommandSubcommandGroupBuilder
  > {
    return this.#builder as ReturnType<typeof this.toSlashCommandBuilder>;
  }

  // Flatten into { ["group.subgroup.command"]: handler]
  #flattenHandlers(handlers: Handlers): { [key: string]: UnknownCommandHandler } {
    const result: { [key: string]: UnknownCommandHandler } = {};
    for (const [key, value] of Object.entries(handlers)) {
      if (typeof value === "function") {
        result[key] = value;
      } else {
        for (const [subKey, subValue] of Object.entries(this.#flattenHandlers(value))) {
          result[`${key}.${subKey}`] = subValue;
        }
      }
    }
    return result;
  }

  toHandler(): If<Settings["TopLevel"], UnknownCommandHandler, never> {
    if (!this._topLevel) throw new Error("Cannot get handler for non-top-level group");
    const handlers = this.#flattenHandlers(this.#handlers);

    return (async (ctx: UnknownContext, int: ChatInputCommandInteraction) => {
      const group = int.options.getSubcommandGroup(false);
      const command = int.options.getSubcommand(false);
      const qualifiedName = [group, command].filter(Boolean).join(".");
      const handler = handlers[qualifiedName];
      if (!handler) throw new Error(`No handler found for ${qualifiedName}`);
      await handler(ctx, int);
    }) as unknown as ReturnType<typeof this.toHandler>;
  }
}

interface CommandSettings {
  HasHandler: boolean;
  HasDescription: boolean;
}

const commandSettingsInitBase: CommandSettings = {
  HasDescription: false,
  HasHandler: false,
};

// TODO: Disable the ability to add required options if non-required options are present
export class SlashCommand<
  const Context extends HashiraContext<HashiraDecorators>,
  const Settings extends CommandSettings = typeof commandSettingsInitBase,
  const Options extends BaseDecorator = typeof optionsInitBase,
> {
  // Enforce nominal typing
  protected declare readonly nominal: [Settings, Options];
  #builder = new SlashCommandSubcommandBuilder();
  #options: Record<string, OptionBuilder<boolean, unknown>> = {};
  #handler?: UnknownCommandHandler;

  setDescription(
    description: string,
  ): SlashCommand<Context, Settings & { HasDescription: true }, Options> {
    this.#builder.setDescription(description);
    return this as unknown as ReturnType<typeof this.setDescription>;
  }

  addAttachment<
    const T extends string,
    const U extends AttachmentOptionBuilder<true, boolean>,
  >(
    name: T,
    input: (builder: AttachmentOptionBuilder) => U,
  ): SlashCommand<
    Context,
    Settings,
    Prettify<Options & { [key in T]: OptionDataType<U> }>
  > {
    const option = input(new AttachmentOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addAttachmentOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addAttachment<T, U>>;
  }

  addString<const T extends string, const U extends StringOptionBuilder<true, boolean>>(
    name: T,
    input: (builder: StringOptionBuilder) => U,
  ): SlashCommand<
    Context,
    Settings,
    Prettify<Options & { [key in T]: OptionDataType<U> }>
  > {
    const option = input(new StringOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addStringOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addString<T, U>>;
  }

  addUser<const T extends string, const U extends UserOptionBuilder<true, boolean>>(
    name: T,
    input: (builder: UserOptionBuilder) => U,
  ): SlashCommand<
    Context,
    Settings,
    Prettify<Options & { [key in T]: OptionDataType<U> }>
  > {
    const option = input(new UserOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addUserOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addUser<T, U>>;
  }

  addRole<const T extends string, const U extends RoleOptionBuilder<true, boolean>>(
    name: T,
    input: (builder: RoleOptionBuilder) => U,
  ): SlashCommand<
    Context,
    Settings,
    Prettify<Options & { [key in T]: OptionDataType<U> }>
  > {
    const option = input(new RoleOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addRoleOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addRole<T, U>>;
  }

  toSlashCommandBuilder(): SlashCommandSubcommandBuilder {
    return this.#builder;
  }

  toHandler(): If<Settings["HasHandler"], UnknownCommandHandler, undefined> {
    return this.#handler as ReturnType<typeof this.toHandler>;
  }

  async options(interaction: ChatInputCommandInteraction): Promise<Options> {
    // TODO: This should use custom logic to handle different types of
    // options (e.g. user, member, role, etc.) and also custom options
    const options: Record<string, unknown> = {};
    await Promise.all(
      this.#builder.options.map(async (option) => {
        const optionBuilder = this.#options[option.name];
        if (!optionBuilder)
          throw new Error(`No option builder found for ${option.name}`);
        options[option.name] = await optionBuilder.transform(interaction, option.name);
      }),
    );
    return options as Options;
  }

  handle(
    handler: (
      ctx: Context,
      options: Options,
      interaction: ChatInputCommandInteraction,
    ) => Promise<void>,
  ): SlashCommand<Context, Settings & { HasHandler: true }, Options> {
    // TODO: These handlers could be more efficient if we modified the
    // source code. This is how Elysia handles such cases.
    const _handler = async (ctx: Context, interaction: ChatInputCommandInteraction) =>
      await handler(ctx, await this.options(interaction), interaction);

    this.#handler = _handler as UnknownCommandHandler;

    return this as unknown as ReturnType<typeof this.handle>;
  }
}
