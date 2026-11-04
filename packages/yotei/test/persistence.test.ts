import { expect, it } from "bun:test";
import { Effect } from "effect";

import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";

import * as Persistence from "../src/persistence";

it("retains an attempt through transaction rejection, handler work, and acknowledgment", async () => {
  const operation = Promise.withResolvers<boolean>();
  const handler = Promise.withResolvers<boolean>();
  const entered = Promise.withResolvers<void>();
  const acknowledging = Promise.withResolvers<void>();
  const acknowledgment = Promise.withResolvers<void>();
  let callback: (tx: PrismaTransaction) => Promise<boolean>;
  const store = Persistence.make({
    $transaction: (body: typeof callback) => {
      callback = body;
      return operation.promise;
    },
  } as unknown as ExtendedPrismaClient);
  const timeout = new Error("transaction timeout");
  let settled = false;
  const result = Effect.runPromise(
    store.consume(() =>
      Effect.promise(async () => {
        entered.resolve();
        return handler.promise;
      }),
    ),
  )
    .catch((error: unknown) => error)
    .finally(() => {
      settled = true;
    });
  await new Promise((resolve) => setImmediate(resolve));
  const body = callback!({
    $queryRaw: async () => [{ id: 1, data: {}, createdAt: new Date() }],
    task: {
      update: async () => {
        acknowledging.resolve();
        await acknowledgment.promise;
      },
    },
  } as unknown as PrismaTransaction);
  await entered.promise;
  operation.reject(timeout);
  await new Promise((resolve) => setImmediate(resolve));
  expect(settled).toBe(false);
  handler.resolve(true);
  await acknowledging.promise;
  expect(settled).toBe(false);
  acknowledgment.resolve();
  await body;
  expect(await result).toMatchObject({ cause: timeout });
  await expect(callback!({} as PrismaTransaction)).rejects.toThrow("after settlement");
});

it("does not reschedule a task completed between selection and update", async () => {
  let status = "pending";
  let changed = false;
  const store = Persistence.make({
    task: {
      findFirst: async () => {
        status = "completed";
        return { id: 1, createdAt: new Date() };
      },
      updateMany: async ({ where }: { where: { status?: string } }) => {
        changed = where.status === undefined || status === where.status;
        return { count: Number(changed) };
      },
    },
  } as unknown as ExtendedPrismaClient);
  expect(await Effect.runPromise(store.updateTaskDelay("test", "id", 60))).toBe(false);
  expect(changed).toBe(false);
});
