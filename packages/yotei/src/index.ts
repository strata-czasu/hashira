import { Effect, ManagedRuntime } from "effect";

import type { Prettify } from "@hashira/utils/types";

import type { ConsumerOptions } from "./consumer";
import type { PersistenceTransaction, TaskFindOptions } from "./persistence";
import * as Queue from "./queue";

export type MessageQueueConsumer = { stop(): Promise<void>; awaitIdle(): Promise<void> };
export type MessageQueueConsumerOptions = typeof ConsumerOptions.Type;
/** Opaque handler storage, see the MessageQueue constructor. */
export type MessageQueueHandlerRegistry = Map<string, unknown>;

type Handler<T, U extends Record<string, unknown>> = (props: U, data: T) => Promise<void>;
type Handle = Record<string, unknown>;

const liftHandler =
  <T, Args extends Record<string, unknown>>(handler: Handler<T, Args>) =>
  (props: Args): Queue.QueueHandler =>
  (data) =>
    Effect.tryPromise(() => handler(props, data as T));

/** Promise/fluent API adapter for the Hashira bot. Scheduling and dispatch live in the Effect core. */
export class MessageQueue<
  const HandleTypes extends Handle = {},
  const Args extends Record<string, unknown> = {},
> {
  #handlers: Map<string, (props: Args) => Queue.QueueHandler>;
  #runtime: ManagedRuntime.ManagedRuntime<Queue.Queue, never>;
  #interval: number;

  /**
   * @param handlers Registry to store handlers in. A consumer started by any queue sharing
   *   the registry dispatches to the handlers of the queue constructed last, which lets hot
   *   reload replace handlers without restarting the consumer. The registry is cleared on
   *   construction.
   */
  constructor(
    runtime: ManagedRuntime.ManagedRuntime<Queue.Queue, never>,
    interval = 1000,
    handlers: MessageQueueHandlerRegistry = new Map(),
  ) {
    handlers.clear();
    this.#handlers = handlers as Map<string, (props: Args) => Queue.QueueHandler>;
    this.#runtime = runtime;
    this.#interval = interval;
  }

  addHandler<T, U extends string>(
    type: U,
    handler: Handler<T, Args>,
  ): MessageQueue<Prettify<HandleTypes & Record<U, T>>, Args> {
    this.#handlers.set(type, liftHandler(handler));
    return this;
  }

  addArg<T extends string, U>(): MessageQueue<HandleTypes, Prettify<Args & Record<T, U>>> {
    return this as MessageQueue<HandleTypes, Prettify<Args & Record<T, U>>>;
  }

  async push<T extends keyof HandleTypes>(
    type: T,
    data: HandleTypes[T],
    delay?: number | Date,
    identifier?: string,
    tx?: PersistenceTransaction,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    await this.#runtime.runPromise(
      Effect.flatMap(Queue.Queue, (queue) => queue.push({ type, data }, delay, identifier, tx)),
    );
  }

  async cancel<T extends keyof HandleTypes>(
    type: T,
    identifier: string,
    options?: TaskFindOptions,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    await this.#runtime.runPromise(
      Effect.flatMap(Queue.Queue, (queue) => queue.cancel(type, identifier, options)),
    );
  }

  async updateDelay<T extends keyof HandleTypes>(
    type: T,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");
    await this.#runtime.runPromise(
      Effect.flatMap(Queue.Queue, (queue) => queue.updateDelay(type, identifier, delay, options)),
    );
  }

  async startConsumer(
    props: Args,
    options: MessageQueueConsumerOptions,
  ): Promise<MessageQueueConsumer> {
    const resolved = { ...options, pollIntervalMs: options.pollIntervalMs ?? this.#interval };
    const consumer = await this.#runtime.runPromise(
      Effect.flatMap(Queue.Queue, (queue) =>
        queue.startConsumer((type) => this.#handlers.get(type)?.(props), resolved),
      ),
    );
    return {
      stop: () => this.#runtime.runPromise(consumer.stop),
      awaitIdle: () => this.#runtime.runPromise(consumer.awaitIdle),
    };
  }
}

export * as Runtime from "effect/ManagedRuntime";
export { ConsumerOptions, makeConsumer } from "./consumer";
export * as Persistence from "./persistence";

export * as Queue from "./queue";
