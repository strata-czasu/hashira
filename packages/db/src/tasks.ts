import { addSeconds } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import {
  type ExtendedPrismaClient,
  type PrismaTransaction,
  type Task,
  schema,
} from ".";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

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
   * Enqueue a message to be handled later by the message queue
   * @param type {string} The type of message to be handled
   * @param data {unknown} The data to be handled
   * @param delay {number} The delay in seconds before the message is handled
   * @param identifier {string} The identifier of the task
   */
  async push<T extends keyof HandleTypes>(
    type: T,
    data: HandleTypes[T],
    delay?: number,
    identifier?: string,
  ) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    const handleAfter = delay ? addSeconds(new Date(), delay) : new Date();

    await this.#prisma.task.create({
      data: {
        data: { type, data },
        handleAfter,
        ...(identifier ? { identifier } : {}),
      },
    });
  }

  async cancel<T extends keyof HandleTypes>(type: T, identifier: string) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    await this.#prisma.$transaction(async (tx) => {
      await tx.$drizzle
        .update(schema.Task)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(sql`${schema.Task.data}->>'type'`, type),
            eq(schema.Task.identifier, identifier),
          ),
        );
    });
  }

  /**
   * Update the delay of a task
   * The endsAt value will be calculated from the original creation time of the task plus the new delay
   * @param type {string} The type of message to be handled
   * @param identifier {string} The identifier of the task
   * @param delay {number} The delay in seconds before the message is handled
   */
  async updateDelay<T extends keyof HandleTypes>(
    type: T,
    identifier: string,
    delay: number,
  ) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    const handleAfter = sql`${schema.Task.createdAt} + make_interval(secs => ${delay})`;

    await this.#prisma.$transaction(async (tx) => {
      await tx.$drizzle
        .update(schema.Task)
        .set({ handleAfter })
        .where(
          and(
            eq(sql`${schema.Task.data}->>'type'`, type),
            eq(schema.Task.identifier, identifier),
            eq(schema.Task.status, "pending"),
          ),
        );
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
