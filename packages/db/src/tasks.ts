import type { Prettify } from "@hashira/utils/types";
import { addSeconds } from "date-fns";
import type { ExtendedPrismaClient, PrismaTransaction, Task } from ".";

export async function getPendingTask(tx: PrismaTransaction) {
  return await tx.$queryRaw<
    Task[]
  >`SELECT * FROM "task" WHERE "status" = 'pending' AND "handleAfter" <= now() FOR UPDATE SKIP LOCKED LIMIT 1`;
}

const finishTask = (tx: PrismaTransaction, id: number) =>
  tx.task.update({ where: { id }, data: { status: "completed" } });

const failTask = (tx: PrismaTransaction, id: number) =>
  tx.task.update({ where: { id }, data: { status: "failed" } });

interface TaskData {
  type: string;
  data: unknown;
}

function isTaskData(data: unknown): data is TaskData {
  if (!data) return false;
  if (typeof data !== "object") return false;
  if (!("type" in data)) return false;
  if (typeof data.type !== "string") return false;
  if (!("data" in data)) return false;
  if (typeof data.data !== "object") return false;
  return true;
}

type Handler<T, U extends Record<string, unknown>> = (
  props: U,
  data: T,
) => Promise<void>;

type TaskDataValue =
  | string
  | number
  | boolean
  | { [x: string]: TaskDataValue }
  | TaskDataValue[];

type Handle = { [key: string]: TaskDataValue };

const initHandleTypes = {};

type TaskFindOptions = {
  throwIfNotFound?: boolean;
};

const handleDelay = (delay: number | Date, accordingTo?: Date) => {
  if (delay instanceof Date) return delay;
  return addSeconds(accordingTo ?? new Date(), delay);
};

export class MessageQueue<
  const HandleTypes extends Handle = typeof initHandleTypes,
  const Args extends Record<string, unknown> = typeof initHandleTypes,
> {
  #handlers: Map<string, Handler<unknown, Record<string, unknown>>> = new Map();
  #prisma: ExtendedPrismaClient;
  #interval: number;
  #running = false;

  constructor(prisma: ExtendedPrismaClient, interval = 1000) {
    this.#prisma = prisma;
    this.#interval = interval;
  }

  addHandler<T, U extends string>(
    type: U,
    handler: Handler<T, Args>,
  ): MessageQueue<Prettify<HandleTypes & Record<U, T>>, Args> {
    this.#handlers.set(type, handler as Handler<unknown, Record<string, unknown>>);

    return this;
  }

  addArg<T extends string, U>(): MessageQueue<
    HandleTypes,
    Prettify<Args & Record<T, U>>
  > {
    return this as MessageQueue<HandleTypes, Prettify<Args & Record<T, U>>>;
  }

  /**
   * Enqueue a message to be handled later by the message queue using a new transaction
   * @param type {string} The type of message to be handled
   * @param data {unknown} The data to be handled
   * @param delay {number|Date} The delay in seconds before the message is handled
   * @param identifier {string} The identifier of the task
   */
  async push<T extends keyof HandleTypes>(
    type: T,
    data: HandleTypes[T],
    delay?: number | Date,
    identifier?: string,
  ) {
    await this.pushTx(this.#prisma, type, data, delay, identifier);
  }

  async pushTx<T extends keyof HandleTypes>(
    tx: PrismaTransaction,
    type: T,
    data: HandleTypes[T],
    delay?: number | Date,
    identifier?: string,
  ) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    const handleAfter = delay ? handleDelay(delay) : new Date();

    await tx.task.create({
      data: {
        data: { type, data },
        handleAfter,
        ...(identifier ? { identifier } : {}),
      },
    });
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
    options?: TaskFindOptions,
  ) {
    await this.cancelTx(this.#prisma, type, identifier, options);
  }

  /**
   * Cancel a task with the given identifier and type
   * @param tx {PrismaTransaction} The transaction to use
   * @param type {string} The type of message to be handled
   * @param identifier {string} The identifier of the task
   * @param options {TaskFindOptions} Options for finding the task
   */
  async cancelTx<T extends keyof HandleTypes>(
    tx: PrismaTransaction,
    type: T,
    identifier: string,
    options?: TaskFindOptions,
  ) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    const task = await tx.task.findFirst({
      where: {
        identifier,
        status: "pending",
        data: { path: ["type"], equals: type },
      },
    });

    if (!task) {
      if (options?.throwIfNotFound)
        throw new Error(`Task not found for identifier ${identifier} for type ${type}`);
      return;
    }

    await tx.task.update({
      where: { id: task.id },
      data: { status: "cancelled" },
    });
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
    options?: TaskFindOptions,
  ) {
    await this.updateDelayTx(this.#prisma, type, identifier, delay, options);
  }

  async updateDelayTx<T extends keyof HandleTypes>(
    tx: PrismaTransaction,
    type: T,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions,
  ) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    const task = await tx.task.findFirst({
      where: {
        identifier,
        status: "pending",
        data: { path: ["type"], equals: type },
      },
    });

    if (!task) {
      if (options?.throwIfNotFound)
        throw new Error(`Task not found for identifier ${identifier} for type ${type}`);
      return;
    }

    const handleAfter = handleDelay(delay, task.createdAt);
    await tx.task.update({
      where: { id: task.id },
      data: { handleAfter },
    });
  }

  private async handleTask(props: Record<string, unknown>, task: unknown) {
    if (!isTaskData(task)) return false;
    const handler = this.#handlers.get(task.type);
    if (!handler) return false;

    try {
      await handler(props, task.data);
    } catch (e) {
      // TODO: proper logging
      console.error(e);
      return false;
    }

    return true;
  }

  private async innerConsumeLoop(props: Args) {
    try {
      await this.#prisma.$transaction(async (tx) => {
        const [task] = await getPendingTask(tx);
        if (!task) return;

        const handled = await this.handleTask(props, task.data);
        if (!handled) {
          await failTask(tx, task.id);
          return;
        }

        await finishTask(tx, task.id);
      });
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => this.innerConsumeLoop(props), this.#interval);
  }

  async consumeLoop(props: Args) {
    if (this.#running) throw new Error("MessageQueue is already running");
    this.#running = true;

    await this.innerConsumeLoop(props);
  }
}
