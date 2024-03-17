import type { AllEventsHandling } from "./intents";

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type MaybePromise<T> = T | Promise<T>;

export type EventsWithContext<Context extends HashiraContext<HashiraDecorators>> = {
	[K in keyof AllEventsHandling]: (
		ctx: Context,
		...args: Parameters<AllEventsHandling[K]>
	) => Promise<void>;
};

export type UnknownEventWithContext = (
	ctx: unknown,
	...args: unknown[]
) => MaybePromise<void>;

export type BaseDecorator = { [key: string]: unknown };

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
