import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import type {
	BaseDecorator,
	HashiraContext,
	HashiraDecorators,
	If,
	OptionDataType,
	Prettify,
	UnknownContext,
} from "../types";
import { StringOptionBuilder } from "./stringOptionBuilder";
import { UserOptionBuilder } from "./userOptionBuilder";
import { RoleOptionBuilder } from "./roleOptionBuilder";

const optionsInitBase = {};

type UnknownCommandHandler = (
	ctx: UnknownContext,
	interaction: ChatInputCommandInteraction,
) => Promise<void>;

interface Handlers extends Record<string, Handlers | UnknownCommandHandler> {}

export class Group<
	const Context extends HashiraContext<HashiraDecorators>,
	const HasDescription extends boolean = false,
	const TopLevel extends boolean = false,
	const Commands extends BaseDecorator = typeof optionsInitBase,
> {
	// Enforce nominal typing
	protected declare readonly nominal: [HasDescription, TopLevel, Commands];
	protected readonly _topLevel: TopLevel;
	#builder: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder;
	#handlers: Handlers = {};

	constructor(topLevel: TopLevel) {
		this._topLevel = topLevel;
		if (this._topLevel) {
			this.#builder = new SlashCommandBuilder();
		} else {
			this.#builder = new SlashCommandSubcommandGroupBuilder();
		}
	}

	setDescription(description: string): Group<Context, true, TopLevel, Commands> {
		this.#builder.setDescription(description);
		return this as unknown as ReturnType<typeof this.setDescription>;
	}

	addCommand<const T extends string, const U extends SlashCommand<Context, true, true>>(
		name: T,
		input: (builder: SlashCommand<Context, false>) => U,
	): Group<Context, HasDescription, TopLevel, Prettify<Commands & { [key in T]: U }>> {
		const command = input(new SlashCommand());
		const commandBuilder = command.toSlashCommandBuilder().setName(name);
		this.#builder.addSubcommand(commandBuilder);
		this.#handlers[name] = command.toHandler();
		return this as unknown as ReturnType<typeof this.addCommand<T, U>>;
	}

	addGroup<
		const T extends string,
		const U extends Group<Context, true, false, BaseDecorator>,
	>(
		name: T,
		input: (builder: Group<Context, false, false>) => U,
	): If<
		TopLevel,
		Group<Context, HasDescription, TopLevel, Prettify<Commands & { [key in T]: U }>>,
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
		TopLevel,
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

	toHandler(): If<TopLevel, UnknownCommandHandler, never> {
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

// TODO: Disable the ability to add required options if non-required options are present
export class SlashCommand<
	const Context extends HashiraContext<HashiraDecorators>,
	const HasHandler extends boolean = false,
	const HasDescription extends boolean = false,
	const Options extends BaseDecorator = typeof optionsInitBase,
> {
	// Enforce nominal typing
	protected declare readonly nominal: [HasHandler, HasDescription, Options];
	#builder = new SlashCommandSubcommandBuilder();
	#handler?: UnknownCommandHandler;

	setDescription(
		description: string,
	): SlashCommand<Context, HasHandler, true, Options> {
		this.#builder.setDescription(description);
		return this as unknown as ReturnType<typeof this.setDescription>;
	}

	addString<const T extends string, const U extends StringOptionBuilder<true, boolean>>(
		name: T,
		input: (builder: StringOptionBuilder) => U,
	): SlashCommand<
		Context,
		HasHandler,
		HasDescription,
		Prettify<Options & { [key in T]: OptionDataType<U> }>
	> {
		const option = input(new StringOptionBuilder()).toSlashCommandOption();
		this.#builder.addStringOption(option.setName(name));
		return this as unknown as ReturnType<typeof this.addString<T, U>>;
	}

	addUser<const T extends string, const U extends UserOptionBuilder<true, boolean>>(
		name: T,
		input: (builder: UserOptionBuilder) => U,
	): SlashCommand<
		Context,
		HasHandler,
		HasDescription,
		Prettify<Options & { [key in T]: OptionDataType<U> }>
	> {
		const option = input(new UserOptionBuilder()).toSlashCommandOption();
		this.#builder.addUserOption(option.setName(name));
		return this as unknown as ReturnType<typeof this.addUser<T, U>>;
	}

	addRole<const T extends string, const U extends RoleOptionBuilder<true, boolean>>(
		name: T,
		input: (builder: RoleOptionBuilder) => U,
	): SlashCommand<
		Context,
		HasHandler,
		HasDescription,
		Prettify<Options & { [key in T]: OptionDataType<U> }>
	> {
		const option = input(new RoleOptionBuilder()).toSlashCommandOption();
		this.#builder.addRoleOption(option.setName(name));
		return this as unknown as ReturnType<typeof this.addRole<T, U>>;
	}

	toSlashCommandBuilder(): SlashCommandSubcommandBuilder {
		return this.#builder;
	}

	toHandler(): HasHandler extends true ? UnknownCommandHandler : undefined {
		return this.#handler as ReturnType<typeof this.toHandler>;
	}

	options(interaction: ChatInputCommandInteraction): Options {
		const options: Record<string, unknown> = {};
		for (const option of this.#builder.options) {
			options[option.name] = interaction.options.get(option.name)?.value ?? null;
		}
		return options as Options;
	}

	handle(
		handler: (
			ctx: Context,
			options: Options,
			interaction: ChatInputCommandInteraction,
		) => Promise<void>,
	): SlashCommand<Context, true, HasDescription, Options> {
		const _handler = (ctx: Context, interaction: ChatInputCommandInteraction) =>
			handler(ctx, this.options(interaction), interaction);

		this.#handler = _handler as UnknownCommandHandler;

		return this as unknown as ReturnType<typeof this.handle>;
	}
}
