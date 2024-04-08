import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandStringOption,
} from "discord.js";
import type {
	BaseDecorator,
	HashiraContext,
	HashiraDecorators,
	OptionBuilder,
	Prettify,
	UnknownContext,
} from "../types";

class StringOptionBuilder<
	Name extends string | undefined = undefined,
	HasDescription extends boolean = false,
	Required extends boolean = true,
> implements OptionBuilder
{
	// This should not be used directly, this enforces the nominal type
	protected declare readonly nominal: [Name, HasDescription, Required];
	#builder = new SlashCommandStringOption();

	setName<NewName extends string>(
		name: NewName,
	): StringOptionBuilder<NewName, HasDescription, Required> {
		this.#builder.setName(name);
		return this as unknown as ReturnType<typeof this.setName<NewName>>;
	}

	setDescription(description: string): StringOptionBuilder<Name, true, Required> {
		this.#builder.setDescription(description);
		return this as ReturnType<typeof this.setDescription>;
	}

	setRequired<NewRequired extends boolean>(
		required: NewRequired,
	): StringOptionBuilder<Name, HasDescription, NewRequired> {
		this.#builder.setRequired(required);
		return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
	}

	toSlashCommandOption() {
		return this.#builder;
	}
}

const optionsInitBase = {};

type OptionDataType<Option extends OptionBuilder> = Option extends StringOptionBuilder<
	string,
	true,
	true
>
	? string
	: Option extends StringOptionBuilder<string, true, false>
	  ? string | null
	  : never;

type UnknownCommandHandler = (
	ctx: UnknownContext,
	interaction: ChatInputCommandInteraction,
) => Promise<void>;

// TODO: Options should only represent data types and meta, not the entire builder
export class SlashCommand<
	const Context extends HashiraContext<HashiraDecorators>,
	const Name extends string | undefined = undefined,
	const HasHandler extends boolean = false,
	const HasDescription extends boolean = false,
	const Options extends BaseDecorator = typeof optionsInitBase,
> {
	// This should not be used directly, this enforces the nominal type
	protected declare readonly nominal: [Name, HasHandler, HasDescription];
	#builder = new SlashCommandBuilder();
	#handler?: UnknownCommandHandler;

	setName<NewName extends string>(
		name: NewName,
	): SlashCommand<Context, NewName, HasHandler, HasDescription, Options> {
		this.#builder.setName(name);
		return this as unknown as ReturnType<typeof this.setName<NewName>>;
	}

	setDescription(
		description: string,
	): SlashCommand<Context, Name, HasHandler, true, Options> {
		this.#builder.setDescription(description);
		return this as unknown as ReturnType<typeof this.setDescription>;
	}

	// TODO: Restructure registerOption to not use 'extends' for better type inference
	// addStringOption(name: T, input: Builder => Option)
	addStringOption<Option extends StringOptionBuilder<string, true, boolean>>(
		input: (builder: StringOptionBuilder) => Option,
	): Option extends StringOptionBuilder<infer OptionName, true, boolean>
		? OptionName extends string
			? SlashCommand<
					Context,
					Name,
					HasHandler,
					HasDescription,
					Prettify<Options & { [key in OptionName]: OptionDataType<Option> }>
			  >
			: never
		: never {
		const option = input(new StringOptionBuilder()).toSlashCommandOption();
		this.#builder.addStringOption(option);
		return this as unknown as ReturnType<typeof this.addStringOption<Option>>;
	}

	toSlashCommandBuilder(): SlashCommandBuilder {
		return this.#builder;
	}

	toHandler(): HasHandler extends true ? UnknownCommandHandler : undefined {
		return this.#handler as ReturnType<typeof this.toHandler>;
	}

	options(interaction: ChatInputCommandInteraction): Options {
		const options: Record<string, unknown> = {};
		for (const option of this.#builder.options) {
			if (option instanceof SlashCommandStringOption) {
				options[option.name] = interaction.options.get(option.name)?.value;
			}
		}
		return options as Options;
	}

	handle(
		handler: (
			ctx: Context,
			options: Options,
			interaction: ChatInputCommandInteraction,
		) => Promise<void>,
	): HasHandler extends false
		? SlashCommand<Context, Name, true, HasDescription, Options>
		: never {
		const _handler = (ctx: Context, interaction: ChatInputCommandInteraction) =>
			handler(ctx, this.options(interaction), interaction);

		this.#handler = _handler as UnknownCommandHandler;

		return this as unknown as ReturnType<typeof this.handle>;
	}
}
