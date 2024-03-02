export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type MaybePromise<T> = T | Promise<T>;
