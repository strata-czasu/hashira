import {
	ChatInputCommandInteraction,
	Client,
	REST,
	Routes,
	type SlashCommandBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { type EventMethodName, allEventsToIntent } from "./intents";
import type {
	BaseDecorator,
	EventsWithContext,
	HashiraContext,
	HashiraDecorators,
	MaybePromise,
	Prettify,
	UnknownContext,
	UnknownDerive,
	UnknownEventWithContext,
} from "./types";

const decoratorInitBase = {
	const: {},
	derive: {},
	state: {},
};

type HashiraOptions = {
	name: string;
};

type HashiraSlashCommandOptions =
	| SlashCommandBuilder
	| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	| SlashCommandSubcommandsOnlyBuilder;

class Hashira<Decorators extends HashiraDecorators = typeof decoratorInitBase> {
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
			) => MaybePromise<void>,
		]
	>;
	#dependencies: string[];
	#name: string;

	constructor(options: HashiraOptions) {
		this.#state = {};
		this.#derive = [];
		this.#const = {};
		this.#methods = new Map();
		this.#commands = new Map();
		this.#dependencies = [options.name];
		this.#name = options.name;
	}

	const<const T extends string, const U>(
		name: T,
		value: U,
	): Hashira<{
		const: Prettify<Decorators["const"] & { [key in T]: U }>;
		derive: Decorators["derive"];
		state: Decorators["state"];
	}> {
		this.#const[name] = value;

		return this as unknown as ReturnType<typeof this.const<T, U>>;
	}

	derive<const T extends BaseDecorator>(
		transform: (ctx: HashiraContext<Decorators>) => T,
	): Hashira<{
		const: Decorators["const"];
		derive: Prettify<Decorators["derive"] & T>;
		state: Decorators["state"];
	}> {
		this.#derive.push(transform as unknown as UnknownDerive);

		return this as unknown as ReturnType<typeof this.derive<T>>;
	}

	state<const T extends string, U>(
		name: T,
		value: U,
	): Hashira<{
		const: Decorators["const"];
		derive: Decorators["derive"];
		state: Prettify<Decorators["state"] & { [key in T]: U }>;
	}> {
		this.#state[name] = value;

		return this as unknown as ReturnType<typeof this.state<T, U>>;
	}

	tapState<T extends keyof Decorators["state"]>(
		name: T,
		tapper: (value: Decorators["state"][T]) => void,
	): this {
		tapper((this.#state as Decorators["state"])[name]);
		console.log(this.#state);
		return this;
	}

	use<NewHashira extends Hashira>(
		instance: NewHashira,
	): NewHashira extends Hashira<infer NewDecorators>
		? Hashira<{
				const: Prettify<Decorators["const"] & NewDecorators["const"]>;
				derive: Prettify<Decorators["derive"] & NewDecorators["derive"]>;
				state: Prettify<Decorators["state"] & NewDecorators["state"]>;
		  }>
		: never {
		// TODO: this might break if two instances have the same name
		if (this.#dependencies.includes(instance.#name)) {
			return this as unknown as ReturnType<typeof this.use<NewHashira>>;
		}
		this.#const = { ...this.#const, ...instance.#const };
		this.#derive = [...this.#derive, ...instance.#derive];
		this.#state = { ...this.#state, ...instance.#state };
		this.#methods = new Map([...this.#methods, ...instance.#methods]);
		this.#commands = new Map([...this.#commands, ...instance.#commands]);
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
	): Hashira<Decorators> {
		const methods = this.#methods.get(methodName) ?? [];

		this.#methods.set(methodName, [...methods, method as UnknownEventWithContext]);

		return this;
	}

	command<T extends HashiraSlashCommandOptions>(
		commandBuilder: T,
		handler: (
			context: HashiraContext<Decorators>,
			interaction: ChatInputCommandInteraction,
		) => MaybePromise<void>,
	): Hashira<Decorators> {
		this.#commands.set(commandBuilder.name, [
			commandBuilder,
			handler as (
				context: UnknownContext,
				interaction: ChatInputCommandInteraction,
			) => MaybePromise<void>,
		]);

		return this;
	}

	async loadHandlers(discordClient: Client) {
		for (const [event, handlers] of this.#methods) {
			for (let i = 0; i < handlers.length; i++) {
				// This prevents type being too large for the compiler to handle
				const handler = handlers[i] as (...args: unknown[]) => Promise<void>;
				discordClient.on(event, (...args) => handler(this.context(), ...args));
			}
		}

		discordClient.on("interactionCreate", async (interaction) => {
			if (!interaction.isChatInputCommand()) return;

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
