import type { Prettify } from "@hashira/utils/types";
import { addSeconds } from "date-fns";
import * as v from "valibot";
import type {
  MessageQueuePersistence,
  MessageQueueTask,
  TaskFindOptions,
} from "./persistence";

const TaskData = v.object({
  type: v.string(),
  data: v.nonNullish(v.unknown()),
});

type Handler<T, U extends Record<string, unknown>> = (
  props: U,
  data: T,
) => Promise<void>;

type Handle = { [key: string]: unknown };

const initHandleTypes = {};

const handleDelay = (delay: number | Date, accordingTo?: Date) => {
  if (delay instanceof Date) return delay;
  return addSeconds(accordingTo ?? new Date(), delay);
};

export class MessageQueue<
  Transaction,
  const HandleTypes extends Handle = typeof initHandleTypes,
  const Args extends Record<string, unknown> = typeof initHandleTypes,
> {
  #handlers: Map<string, Handler<unknown, Record<string, unknown>>> = new Map();
  #persistence: MessageQueuePersistence<Transaction>;
  #interval: number;
  #running = false;

  constructor(persistence: MessageQueuePersistence<Transaction>, interval = 1000) {
    this.#persistence = persistence;
    this.#interval = interval;
  }

  addHandler<T, U extends string>(
    type: U,
    handler: Handler<T, Args>,
  ): MessageQueue<Transaction, Prettify<HandleTypes & Record<U, T>>, Args> {
    this.#handlers.set(type, handler as Handler<unknown, Record<string, unknown>>);

    return this;
  }

  addArg<T extends string, U>(): MessageQueue<
    Transaction,
    HandleTypes,
    Prettify<Args & Record<T, U>>
  > {
    return this as MessageQueue<
      Transaction,
      HandleTypes,
      Prettify<Args & Record<T, U>>
    >;
  }

  /**
   * Enqueue a message to be handled later by the message queue using a new transaction
   * @param type {string} The type of message to be handled
   * @param data {unknown} The data to be handled
   * @param delay {number|Date} The delay in seconds before the message is handled
   * @param identifier {string} The identifier of the task
   * @param tx {PrismaTransaction} The transaction to use if any
   */
  async push<T extends keyof HandleTypes>(
    type: T,
    data: HandleTypes[T],
    delay?: number | Date,
    identifier?: string,
    tx?: Transaction,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");

    const handleAfter = delay ? handleDelay(delay) : new Date();

    await this.#persistence.createTask(
      { type: type as string, data },
      handleAfter,
      identifier,
      tx,
    );
  }

  /**
   * Cancel a task with the given identifier and type creating a transaction
   * @param type {string} The type of message to be handled
   * @param identifier {string} The identifier of the task
   * @param options {TaskFindOptions} Options for finding the task
   */
  async cancel<T extends keyof HandleTypes>(
    type: T,
    identifier: string,
    options?: TaskFindOptions<Transaction>,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");

    await this.#persistence.cancelTask(type, identifier, options);
  }

  /**
   * Update the delay of a task
   * The endsAt value will be calculated from the original creation time of the task plus the new delay
   * @param type {string} The type of message to be handled
   * @param identifier {string} The identifier of the task
   * @param delay {number|Date} The delay in seconds before the message is handled
   */
  async updateDelay<T extends keyof HandleTypes>(
    type: T,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions<Transaction>,
  ) {
    if (typeof type !== "string") throw new Error("Type must be a string");

    await this.#persistence.updateTaskDelay(type, identifier, delay, options);
  }

  private async handleTask(props: Record<string, unknown>, task: MessageQueueTask) {
    const result = v.safeParse(TaskData, task.data);
    if (!result.success) return false;

    const handler = this.#handlers.get(result.output.type);
    if (!handler) return false;

    try {
      await handler(props, result.output.data);
    } catch (e) {
      // TODO: proper logging
      console.error(e);
      return false;
    }

    return true;
  }

  private async innerConsumeLoop(props: Args) {
    try {
      await this.#persistence.withPendingTask(async (task, controls) => {
        const handled = await this.handleTask(props, task);

        if (!handled) return controls.fail();

        return controls.complete();
      });
    } catch (e) {
      console.error(e);
    }
  }

  async consumeLoop(props: Args) {
    if (this.#running) throw new Error("MessageQueue is already running");
    this.#running = true;

    setInterval(() => this.innerConsumeLoop(props), this.#interval);
  }
}

export type {
  MessageQueuePersistence,
  MessageQueueTask,
  MessageQueueTaskControls,
  MessageQueueTaskData,
  TaskFindOptions,
} from "./persistence";
export { PrismaMessageQueuePersistence } from "./persistence";
