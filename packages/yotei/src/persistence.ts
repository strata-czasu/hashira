import type {
  ExtendedPrismaClient,
  Prisma,
  PrismaTransaction,
  Task,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { addSeconds } from "date-fns";

export interface TaskFindOptions<T> {
  throwIfNotFound?: boolean;
  tx?: T;
}

export type MessageQueueTaskData = {
  type: string;
  data: unknown;
};

export type MessageQueueTask = {
  id: number;
  data: MessageQueueTaskData;
  createdAt: Date;
};

export interface MessageQueueTaskControls {
  complete(): Promise<void>;
  fail(): Promise<void>;
}

export interface MessageQueuePersistence<Transaction> {
  createTask(
    payload: MessageQueueTaskData,
    handleAfter: Date,
    identifier?: string,
    tx?: Transaction,
  ): Promise<void>;
  cancelTask(
    type: string,
    identifier: string,
    options?: TaskFindOptions<Transaction>,
  ): Promise<boolean>;
  updateTaskDelay(
    type: string,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions<Transaction>,
  ): Promise<boolean>;
  withPendingTask(
    fn: (task: MessageQueueTask, controls: MessageQueueTaskControls) => Promise<void>,
  ): Promise<boolean>;
}

const ensureExecutor = (
  prisma: ExtendedPrismaClient,
  tx?: ExtendedPrismaClient | PrismaTransaction,
): ExtendedPrismaClient => {
  if (!tx) return prisma;
  if ("$transaction" in tx) return tx;

  return nestedTransaction(tx);
};

const ensureTaskFound = (
  task: Task | null | undefined,
  type: string,
  identifier: string,
  options?: TaskFindOptions<unknown>,
) => {
  if (task) return task;

  if (options?.throwIfNotFound) {
    throw new Error(`Task not found for identifier ${identifier} for type ${type}`);
  }

  return null;
};

const calculateHandleAfter = (delay: number | Date, createdAt: Date) => {
  if (delay instanceof Date) return delay;
  return addSeconds(createdAt, delay);
};

type PersistenceTransaction = ExtendedPrismaClient | PrismaTransaction;

export class PrismaMessageQueuePersistence
  implements MessageQueuePersistence<PersistenceTransaction>
{
  readonly #prisma: ExtendedPrismaClient;

  constructor(prisma: ExtendedPrismaClient) {
    this.#prisma = prisma;
  }

  async createTask(
    payload: MessageQueueTaskData,
    handleAfter: Date,
    identifier?: string,
    tx?: PersistenceTransaction,
  ) {
    const executor = ensureExecutor(this.#prisma, tx);

    await executor.task.create({
      data: {
        data: payload as Prisma.InputJsonValue,
        handleAfter,
        ...(identifier ? { identifier } : {}),
      },
    });
  }

  async cancelTask(
    type: string,
    identifier: string,
    options?: TaskFindOptions<PersistenceTransaction>,
  ) {
    const executor = ensureExecutor(this.#prisma, options?.tx);

    const tasks = await executor.task.updateManyAndReturn({
      where: {
        identifier,
        status: "pending",
        data: { path: ["type"], equals: type },
      },
      limit: 1,
      data: { status: "cancelled" },
    });

    return ensureTaskFound(tasks[0], type, identifier, options) !== null;
  }

  async updateTaskDelay(
    type: string,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions<PersistenceTransaction>,
  ) {
    const executor = ensureExecutor(this.#prisma, options?.tx);

    return await executor.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: {
          identifier,
          status: "pending",
          data: { path: ["type"], equals: type },
        },
      });

      const found = ensureTaskFound(task, type, identifier, options);
      if (!found) return false;

      const handleAfter = calculateHandleAfter(delay, found.createdAt);

      await tx.task.update({
        where: { id: found.id },
        data: { handleAfter },
      });

      return true;
    });
  }

  async withPendingTask(
    fn: (task: MessageQueueTask, controls: MessageQueueTaskControls) => Promise<void>,
  ) {
    return await this.#prisma.$transaction(
      async (tx) => {
        const [task] = await tx.$queryRaw<
          Task[]
        >`SELECT * FROM "task" WHERE "status" = 'pending' AND "handleAfter" <= now() FOR UPDATE SKIP LOCKED LIMIT 1`;

        if (!task) return false;

        const normalized: MessageQueueTask = {
          id: task.id,
          data: task.data as MessageQueueTaskData,
          createdAt: task.createdAt,
        };

        let settled = false;
        const mark = async (status: "completed" | "failed") => {
          if (settled) return;
          settled = true;
          await tx.task.update({ where: { id: task.id }, data: { status } });
        };

        const controls: MessageQueueTaskControls = {
          complete: async () => {
            await mark("completed");
          },
          fail: async () => {
            await mark("failed");
          },
        };

        try {
          await fn(normalized, controls);
        } finally {
          if (!settled) {
            await controls.fail();
          }
        }

        return true;
      },
      { timeout: 30000 }, // There are cases where tasks can be long-running, so we set a higher timeout
    );
  }
}
