import type { Prettify } from "@hashira/utils/types";
import {
  type ChatInputCommandInteraction,
  type Permissions,
  SlashCommandBuilder,
} from "discord.js";
import type {
  CommandSettings,
  UnknownCommandHandler,
  commandSettingsInitBase,
  optionsInitBase,
} from ".";
import type {
  BaseDecorator,
  HashiraContext,
  HashiraDecorators,
  If,
  OptionBuilder,
  OptionDataType,
} from "../types";
import { AttachmentOptionBuilder } from "./attachmentOptionBuilder";
import { BooleanOptionBuilder } from "./booleanOptionBuilder";
import { IntegerOptionBuilder } from "./integerOptionBuilder";
import { NumberOptionBuilder } from "./numberOptionBuilder";
import { RoleOptionBuilder } from "./roleOptionBuilder";
import { StringOptionBuilder } from "./stringOptionBuilder";
import { UserOptionBuilder } from "./userOptionBuilder";

// TODO: This is a giant mess, it should be merged with normal SlashCommand but currently it's too fragile
export class TopLevelSlashCommand<
  const Context extends HashiraContext<HashiraDecorators>,
  const Settings extends CommandSettings = typeof commandSettingsInitBase,
  const Options extends BaseDecorator = typeof optionsInitBase,
> {
  // Enforce nominal typing
  protected declare readonly nominal: [Settings, Options];
  #builder = new SlashCommandBuilder();
  #options: Record<string, OptionBuilder<boolean, unknown>> = {};
  #handler?: UnknownCommandHandler;

  setDescription(
    description: string,
  ): TopLevelSlashCommand<Context, Settings & { HasDescription: true }, Options> {
    this.#builder.setDescription(description);
    return this as unknown as ReturnType<typeof this.setDescription>;
  }

  setDefaultMemberPermissions(
    permission: Permissions | number | bigint,
  ): TopLevelSlashCommand<Context, Settings, Options> {
    this.#builder.setDefaultMemberPermissions(permission);
    return this as unknown as ReturnType<typeof this.setDefaultMemberPermissions>;
  }

  setDMPermission(enabled: boolean): TopLevelSlashCommand<Context, Settings, Options> {
    this.#builder.setDMPermission(enabled);
    return this as unknown as ReturnType<typeof this.setDMPermission>;
  }

  addAttachment<
    const T extends string,
    const U extends AttachmentOptionBuilder<true, boolean>,
  >(
    name: T,
    input: (builder: AttachmentOptionBuilder) => U,
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
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
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
  > {
    const option = input(new StringOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addStringOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addString<T, U>>;
  }

  addNumber<const T extends string, const U extends NumberOptionBuilder<true, boolean>>(
    name: T,
    input: (builder: NumberOptionBuilder) => U,
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
  > {
    const option = input(new NumberOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addNumberOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addNumber<T, U>>;
  }

  addInteger<
    const T extends string,
    const U extends IntegerOptionBuilder<true, boolean>,
  >(
    name: T,
    input: (builder: IntegerOptionBuilder) => U,
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
  > {
    const option = input(new IntegerOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addIntegerOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addInteger<T, U>>;
  }

  addUser<const T extends string, const U extends UserOptionBuilder<true, boolean>>(
    name: T,
    input: (builder: UserOptionBuilder) => U,
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
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
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
  > {
    const option = input(new RoleOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addRoleOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addRole<T, U>>;
  }

  addBoolean<
    const T extends string,
    const U extends BooleanOptionBuilder<true, boolean>,
  >(
    name: T,
    input: (builder: BooleanOptionBuilder) => U,
  ): TopLevelSlashCommand<
    Context,
    Settings,
    Prettify<
      Options & {
        [key in T]: OptionDataType<U>;
      }
    >
  > {
    const option = input(new BooleanOptionBuilder());
    const builder = option.toSlashCommandOption().setName(name);
    this.#builder.addBooleanOption(builder);
    this.#options[name] = option;
    return this as unknown as ReturnType<typeof this.addBoolean<T, U>>;
  }

  toSlashCommandBuilder(): SlashCommandBuilder {
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
      Object.entries(this.#options).map(async ([name, optionBuilder]) => {
        options[name] = await optionBuilder.transform(interaction, name);
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
  ): TopLevelSlashCommand<Context, Settings & { HasHandler: true }, Options> {
    const _handler = async (ctx: Context, interaction: ChatInputCommandInteraction) =>
      await handler(ctx, await this.options(interaction), interaction);

    this.#handler = _handler as UnknownCommandHandler;

    return this as unknown as ReturnType<typeof this.handle>;
  }
}
