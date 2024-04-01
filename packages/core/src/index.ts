import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Client,
	REST,
	Routes,
	type SlashCommandBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { handleCustomEvent } from "./customEvents";
import { type EventMethodName, allEventsToIntent, isCustomEvent } from "./intents";
import { SlashCommand } from "./slashCommands";
import type {
	BaseDecorator,
	EventsWithContext,
	HashiraCommands,
	HashiraContext,
	HashiraDecorators,
	Prettify,
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
	| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	| SlashCommandSubcommandsOnlyBuilder;

const handleCommandConflict = (
	[a]: [HashiraSlashCommandOptions, unknown],
	[b]: [HashiraSlashCommandOptions, unknown],
) => {
	throw new Error(
		`Command ${a.name} with descriptiopn: ${a.description} conflicts with ${b.name} with description ${b.description}`,
	);
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

class Hashira<
	Decorators extends HashiraDecorators = typeof decoratorInitBase,
	Commands extends HashiraCommands = typeof commandsInitBase,
> {
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
	#autocomplete: Map<
		string,
		(context: UnknownContext, interaction: AutocompleteInteraction) => Promise<void>
	>;
	#dependencies: string[];
	#name: string;

	constructor(options: HashiraOptions) {
		this.#state = {};
		this.#derive = [];
		this.#const = {};
		this.#methods = new Map();
		this.#commands = new Map();
		this.#autocomplete = new Map();
		this.#dependencies = [options.name];
		this.#name = options.name;
	}

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
	> {
		this.#const[name] = value;

		return this as unknown as ReturnType<typeof this.const<T, U>>;
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
		// TODO: this might break if two instances have the same name
		if (this.#dependencies.includes(instance.#name)) {
			return this as unknown as ReturnType<typeof this.use<NewHashira>>;
		}
		this.#const = { ...this.#const, ...instance.#const };
		this.#derive = [...this.#derive, ...instance.#derive];
		this.#state = { ...this.#state, ...instance.#state };
		this.#methods = mergeMap((a, b) => [...a, ...b], this.#methods, instance.#methods);
		this.#commands = mergeMap(
			handleCommandConflict,
			this.#commands,
			instance.#commands,
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

	/**
	 *  @deprecated
	 */
	command<T extends HashiraSlashCommandOptions>(
		commandBuilder: T,
		handler: (
			context: HashiraContext<Decorators>,
			interaction: ChatInputCommandInteraction,
		) => Promise<void>,
	): Hashira<Decorators, Commands> {
		this.#commands.set(commandBuilder.name, [
			commandBuilder,
			handler as (
				context: UnknownContext,
				interaction: ChatInputCommandInteraction,
			) => Promise<void>,
		]);

		return this;
	}

	newCommand<
		T extends SlashCommand<
			HashiraContext<Decorators>,
			string,
			true,
			true,
			BaseDecorator
		>,
	>(
		init: (builder: SlashCommand<HashiraContext<Decorators>>) => T,
	): T extends SlashCommand<
		HashiraContext<Decorators>,
		infer CommandName,
		true,
		true,
		infer Options
	>
		? CommandName extends string
			? Hashira<
					Decorators,
					Prettify<
						Commands & { [key in CommandName]: { name: CommandName; options: Options } }
					>
			  >
			: never
		: never {
		const command = init(new SlashCommand());
		const builder = command.toSlashCommandBuilder();
		const handler = command.toHandler();
		this.#commands.set(builder.name, [builder, handler]);
		return this as unknown as ReturnType<typeof this.newCommand<T>>;
	}

	autocomplete<
		T extends HashiraSlashCommandOptions,
		U extends AutocompleteInteraction = AutocompleteInteraction,
	>(
		commandBuilder: T,
		handler: (context: HashiraContext<Decorators>, interaction: U) => Promise<void>,
	): Hashira<Decorators> {
		this.#autocomplete.set(
			commandBuilder.name,
			handler as (
				context: UnknownContext,
				interaction: AutocompleteInteraction,
			) => Promise<void>,
		);

		return this;
	}

	private async handleCommand(interaction: ChatInputCommandInteraction) {
		const command = this.#commands.get(interaction.commandName);

		if (!command) return;
		const [_, handler] = command;

		try {
			await handler(this.context(), interaction);
		} catch (error) {
			// TODO: #1 Add proper error logging
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: "There was an error while executing this command!",
					ephemeral: true,
				});
			} else {
				await interaction.reply({
					content: "There was an error while executing this command!",
					ephemeral: true,
				});
			}
		}
	}

	private async handleAutocomplete(interaction: AutocompleteInteraction) {
		const handler = this.#autocomplete.get(interaction.commandName);

		if (!handler) return;

		try {
			await handler(this.context(), interaction);
		} catch (error) {
			// TODO: #1 Add proper error logging
			console.error(error);
			await interaction.respond([]);
		}
	}

	async loadHandlers(discordClient: Client) {
		for (const [event, handlers] of this.#methods) {
			for (const rawHandler of handlers) {
				if (isCustomEvent(event)) {
					const [discordEvent, handler] = handleCustomEvent(event, rawHandler);
					discordClient.on(discordEvent, (...args) => handler(this.context(), ...args));
				} else {
					discordClient.on(event, (...args) => rawHandler(this.context(), ...args));
				}
			}
		}

		discordClient.on("interactionCreate", async (interaction) => {
			if (interaction.isChatInputCommand()) return this.handleCommand(interaction);
			if (interaction.isAutocomplete()) return this.handleAutocomplete(interaction);
		});

		// TODO: #1 Add proper error logging
		discordClient.on("error", console.error);
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
		});

		this.loadHandlers(discordClient);

		await discordClient.login(token);
	}

	async registerCommands(token: string, guildId: string, clientId: string) {
		const rest = new REST().setToken(token);
		const commands = Array.from(this.#commands.values()).map(([commandBuilder]) =>
			commandBuilder.toJSON(),
		);

		try {
			await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
				body: commands,
			});

			console.log("Successfully registered application commands.");
		} catch (error) {
			console.error(error);
		}
	}
}

export { Hashira, decoratorInitBase };
export type { HashiraContext, HashiraDecorators, BaseDecorator };
export { PaginatedView } from "./paginatedView";
