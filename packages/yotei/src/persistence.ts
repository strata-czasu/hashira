import { Clock, Context, Effect, Layer, Schema } from "effect";

import type { ExtendedPrismaClient, Prisma, PrismaTransaction } from "@hashira/db";

import { joinCallback } from "./joinCallback";

export type PersistenceTransaction = PrismaTransaction;
export type TaskFindOptions = { tx?: PersistenceTransaction };
export type MessageQueueTaskData = { type: string; data: unknown };
export type MessageQueueTask = { id: number; data: unknown; createdAt: Date };

export class QueuePersistenceError extends Schema.TaggedError<QueuePersistenceError>()(
  "QueuePersistenceError",
  { cause: Schema.Unknown },
) {}

export interface Store {
  createTask(
    payload: MessageQueueTaskData,
    delay?: number | Date,
    identifier?: string,
    tx?: PersistenceTransaction,
  ): Effect.Effect<void, QueuePersistenceError>;
  cancelTask(
    type: string,
    identifier: string,
    options?: TaskFindOptions,
  ): Effect.Effect<boolean, QueuePersistenceError>;
  updateTaskDelay(
    type: string,
    identifier: string,
    delay: number | Date,
    options?: TaskFindOptions,
  ): Effect.Effect<boolean, QueuePersistenceError>;
  consume<R>(
    handle: (task: MessageQueueTask) => Effect.Effect<boolean, never, R>,
  ): Effect.Effect<boolean, QueuePersistenceError, R>;
}

export class QueueStore extends Context.Service<QueueStore, Store>()("@hashira/yotei/QueueStore") {}

const attempt = <A>(body: () => PromiseLike<A>) =>
  Effect.tryPromise({
    try: body,
    catch: (cause) => new QueuePersistenceError({ cause }),
  });

const pending = (type: string, identifier: string): Prisma.TaskWhereInput => ({
  identifier,
  status: "pending",
  data: { path: ["type"], equals: type },
});

const handleAfter = (delay: number | Date, base: number) =>
  delay instanceof Date ? delay : new Date(base + delay * 1000);

export const make = (prisma: ExtendedPrismaClient): Store => ({
  createTask: Effect.fnUntraced(function* (
    payload: MessageQueueTaskData,
    delay: number | Date = 0,
    identifier?: string,
    tx?: PersistenceTransaction,
  ) {
    const now = yield* Clock.currentTimeMillis;
    yield* attempt(() =>
      (tx ?? prisma).task.create({
        data: {
          data: payload as Prisma.InputJsonValue,
          handleAfter: handleAfter(delay, now),
          ...(identifier === undefined ? {} : { identifier }),
        },
      }),
    );
  }),
  cancelTask: (type, identifier, options) =>
    attempt(() =>
      (options?.tx ?? prisma).task.updateMany({
        where: pending(type, identifier),
        limit: 1,
        data: { status: "cancelled" },
      }),
    ).pipe(Effect.map(({ count }) => count > 0)),
  updateTaskDelay: (type, identifier, delay, options) =>
    attempt(async () => {
      const executor = options?.tx ?? prisma;
      const task = await executor.task.findFirst({
        where: pending(type, identifier),
        select: { id: true, createdAt: true },
      });
      if (!task) return false;
      const result = await executor.task.updateMany({
        where: { id: task.id, status: "pending" },
        data: { handleAfter: handleAfter(delay, task.createdAt.getTime()) },
      });
      return result.count > 0;
    }),
  consume: Effect.fnUntraced(function* <R>(
    handle: (task: MessageQueueTask) => Effect.Effect<boolean, never, R>,
  ) {
    const run = Effect.runPromiseWith(yield* Effect.context<R>());
    return yield* attempt(() =>
      joinCallback(
        (callback) => prisma.$transaction(callback, { timeout: 30_000 }),
        async (tx: PrismaTransaction) => {
          const [task] = await tx.$queryRaw<MessageQueueTask[]>`
          SELECT id, data, "createdAt" FROM task
          WHERE status = 'pending' AND "handleAfter" <= NOW()
          LIMIT 1 FOR UPDATE SKIP LOCKED
        `;
          if (!task) return false;
          const success = await run(Effect.suspend(() => handle(task)));
          await tx.task.update({
            where: { id: task.id },
            data: { status: success ? "completed" : "failed" },
          });
          return true;
        },
      ),
    );
  }, Effect.uninterruptible),
});

export const layer = (prisma: ExtendedPrismaClient) => Layer.succeed(QueueStore, make(prisma));
