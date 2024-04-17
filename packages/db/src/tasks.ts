import { and, eq, lte, sql } from "drizzle-orm";
import type { Transaction, db } from ".";
import { type TaskDataValue, task } from "./schema";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export async function getPendingTask<T extends Transaction>(tx: T) {
  return await tx
    .select()
    .from(task)
    .where(and(eq(task.status, "pending"), lte(task.handleAfter, sql`now()`)))
    .for("update", { skipLocked: true });
}

export async function finishTask<T extends Transaction>(tx: T, id: number) {
  await tx.update(task).set({ status: "completed" }).where(eq(task.id, id));
}

export async function failTask<T extends Transaction>(tx: T, id: number) {
  await tx.update(task).set({ status: "failed" }).where(eq(task.id, id));
}

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

type Handle = { [key: string]: TaskDataValue };

const initHandleTypes = {};

export class MessageQueue<
  const HandleTypes extends Handle = typeof initHandleTypes,
  const Args extends Record<string, unknown> = typeof initHandleTypes,
> {
  #handlers: Map<string, Handler<unknown, Record<string, unknown>>> = new Map();
  #db: typeof db;
  #interval: number;
  #running = false;

  constructor(database: typeof db, interval = 1000) {
    this.#db = database;
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
   * @param delay  {number} The delay in seconds before the message is handled
   */
  async push<T extends keyof HandleTypes>(
    type: T,
    data: HandleTypes[T],
    delay?: number,
    identifier?: string,
  ) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    const handleAfter = delay
      ? sql`now() + make_interval(secs => ${delay})`
      : sql`now()`;

    await this.#db.insert(task).values({
      data: { type, data },
      handleAfter,
      ...(identifier ? { identifier } : {}),
    });
  }

  async cancel<T extends keyof HandleTypes>(type: T, identifier: string) {
    // This should never happen, but somehow typescript doesn't understand that
    if (typeof type !== "string") throw new Error("Type must be a string");

    await this.#db.transaction(async (tx) => {
      await tx
        .update(task)
        .set({ status: "cancelled" })
        .where(
          and(eq(sql`${task.data}->>'type'`, type), eq(task.identifier, identifier)),
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
    await this.#db.transaction(async (tx) => {
      const [task] = await getPendingTask(tx);
      if (!task) return;

      const handled = await this.handleTask(props, task.data);
      if (!handled) return await failTask(tx, task.id);

      await finishTask(tx, task.id);
    });

    setTimeout(() => this.innerConsumeLoop(props), this.#interval);
  }

  async consumeLoop(props: Args) {
    if (this.#running) throw new Error("MessageQueue is already running");
    this.#running = true;

    await this.innerConsumeLoop(props);
  }
}
