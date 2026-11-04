import { expect, it } from "bun:test";
import { Effect, Layer } from "effect";

import { MessageQueue, Queue, Runtime } from "@hashira/yotei";

import * as Persistence from "../src/persistence";

it("dispatches failures without killing polling and joins Promise handlers on disposal", async () => {
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const outcomes: boolean[] = [];
  const envelopes = [
    { type: "unknown", data: {} },
    { type: "bad", data: {} },
    { type: "good", data: 42 },
  ];
  const runtime = Runtime.make(
    Queue.layer(
      Layer.succeed(Persistence.QueueStore, {
        createTask: () => Effect.void,
        cancelTask: () => Effect.succeed(false),
        updateTaskDelay: () => Effect.succeed(false),
        consume: (handle) =>
          Effect.suspend(() => {
            const data = envelopes.shift();
            if (!data) return Effect.succeed(false);
            return handle({ id: 1, createdAt: new Date(), data }).pipe(
              Effect.tap((result) =>
                Effect.sync(() => {
                  outcomes.push(result);
                }),
              ),
            );
          }),
      }),
    ),
  );
  const queue = new MessageQueue(runtime, 1)
    .addArg<"name", string>()
    .addHandler("bad", async () => {
      throw new Error("handler failed");
    })
    .addHandler("good", async ({ name }, data: number) => {
      expect([name, data]).toEqual(["bot", 42]);
      entered.resolve();
      await release.promise;
    });
  const starts = await Promise.allSettled([
    queue.startConsumer({ name: "bot" }, { maxInFlight: 1 }),
    queue.startConsumer({ name: "bot" }, { maxInFlight: 1 }),
  ]);
  expect(starts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  await entered.promise;
  let disposed = false;
  const closing = runtime.dispose().then(() => {
    disposed = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(disposed).toBe(false);
  release.resolve();
  await closing;
  expect(outcomes).toEqual([false, false, true]);
});
