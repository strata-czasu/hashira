import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { TestClock } from "effect/testing";

import { PrismaClient } from "@hashira/db";

import * as Persistence from "../src/persistence";

const connectionString = process.env.DATABASE_TEST_URL;
const prisma = connectionString
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : null;

describe.skipIf(!connectionString)("Prisma queue transactions", () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });
  it("enlists creation, cancellation, and rescheduling in the caller transaction", async () => {
    if (!prisma) throw new Error("DATABASE_TEST_URL is required");
    const store = Persistence.make(prisma);
    const identifier = crypto.randomUUID();
    const payload = { type: "test", data: { value: 1 } };
    const scheduled = new Date("2030-01-01");
    try {
      await expect(
        prisma.$transaction(async (tx) => {
          await Effect.runPromise(
            store.createTask(payload, 60, identifier, tx).pipe(Effect.provide(TestClock.layer())),
          );
          expect((await tx.task.findFirstOrThrow({ where: { identifier } })).handleAfter).toEqual(
            new Date(60_000),
          );
          throw new Error("rollback");
        }),
      ).rejects.toThrow("rollback");
      expect(await prisma.task.count({ where: { identifier } })).toBe(0);
      await Effect.runPromise(store.createTask(payload, scheduled, identifier));
      const task = await prisma.task.findFirstOrThrow({ where: { identifier } });
      await expect(
        prisma.$transaction(async (tx) => {
          expect(
            await Effect.runPromise(store.updateTaskDelay("test", identifier, 60, { tx })),
          ).toBe(true);
          expect(
            (await tx.task.findUniqueOrThrow({ where: { id: task.id } })).handleAfter.getTime(),
          ).toBe(task.createdAt.getTime() + 60_000);
          expect(await Effect.runPromise(store.cancelTask("other", identifier, { tx }))).toBe(
            false,
          );
          expect(await Effect.runPromise(store.cancelTask("test", identifier, { tx }))).toBe(true);
          throw new Error("rollback");
        }),
      ).rejects.toThrow("rollback");
      expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({
        status: "pending",
        handleAfter: scheduled,
        data: payload,
      });
      await Effect.runPromise(store.cancelTask("test", identifier));
      expect(await Effect.runPromise(store.updateTaskDelay("test", identifier, 60))).toBe(false);
    } finally {
      await prisma.task.deleteMany({ where: { identifier } });
    }
  });
});
