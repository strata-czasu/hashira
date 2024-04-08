import {
	ChatInputCommandInteraction,
	Client,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";
import {
	type AllEventsHandling,
	type EventMethodName,
	allEventsToIntent,
} from "./intents";
import type { MaybePromise, Prettify } from "./types";

type EventsWithContext<Context extends HashiraContext<HashiraDecorators>> = {
	[K in keyof AllEventsHandling]: (
		ctx: Context,
		...args: Parameters<AllEventsHandling[K]>
	) => MaybePromise<void>;
};

type UnknownEventWithContext = (ctx: unknown, ...args: unknown[]) => MaybePromise<void>;

type BaseDecorator = { [key: string]: unknown };

type HashiraContext<Decorators extends HashiraDecorators> = Prettify<
	Decorators["const"] & Decorators["derive"] & { state: Decorators["state"] }
>;
type UnknownContext = { [key: string]: unknown; state: { [key: string]: unknown } };
type UnknownDerive = (ctx: UnknownContext) => BaseDecorator;

type HashiraDecorators = {
	const: BaseDecorator;
	derive: BaseDecorator;
	state: BaseDecorator;
};

const decoratorInitBase = {
	const: {},
	derive: {},
	state: {},
};

type HashiraOptions = {
	name: string;
};

class Hashira<Decorators extends HashiraDecorators = typeof decoratorInitBase> {
	#state: BaseDecorator;
	#derive: UnknownDerive[];
	#const: BaseDecorator;
	#methods: Map<EventMethodName, UnknownEventWithContext[]>;
	#commands: Map<
		string,
		[
			SlashCommandBuilder,
			(interaction: ChatInputCommandInteraction) => MaybePromise<void>,
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

	command<T extends SlashCommandBuilder>(
		commandBuilder: T,
		handler: (interaction: ChatInputCommandInteraction) => MaybePromise<void>,
	): Hashira<Decorators> {
		new SlashCommandBuilder();
		// NOTE: I don't know why this is necessary.

		this.#commands.set(commandBuilder.name, [commandBuilder, handler]);

		return this;
	}

	async start(token: string) {
		const intents = [
			...new Set(
				[...this.#methods.keys()].flatMap((event) => allEventsToIntent[event]),
			),
		];

		const discordClient = new Client({ intents });

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
				await handler(interaction);
			} catch (error) {
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
