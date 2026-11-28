import { Effect, Fiber, FiberSet, Schedule, Schema } from "effect";

import type { MessageQueueTask, QueueStore } from "./persistence";

export const ConsumerOptions = Schema.Struct({
  maxInFlight: Schema.Int.check(Schema.isGreaterThan(0)),
  pollIntervalMs: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 2147483647 })),
  ),
});

export const makeConsumer = Effect.fn("yotei.makeConsumer")(function* (
  store: Pick<QueueStore["Service"], "consume">,
  handle: (task: MessageQueueTask) => Effect.Effect<boolean>,
  options: typeof ConsumerOptions.Type,
) {
  const { maxInFlight, pollIntervalMs = 1000 } =
    yield* Schema.decodeUnknownEffect(ConsumerOptions)(options);

  const attempts = yield* FiberSet.make();

  const polling = yield* FiberSet.run(
    attempts,
    Effect.suspend(() => store.consume(handle)).pipe(
      Effect.catchCause(Effect.logError),
      Effect.uninterruptible,
    ),
    { startImmediately: false },
  ).pipe(
    Effect.when(FiberSet.size(attempts).pipe(Effect.map((size) => size < maxInFlight))),
    Effect.schedule(Schedule.spaced(pollIntervalMs)),
    Effect.forkScoped,
  );

  const consumer = {
    stop: Fiber.interrupt(polling),
    awaitIdle: FiberSet.awaitEmpty(attempts),
  };

  // Join work before the FiberSet's finalizer can interrupt its fibers.
  yield* Effect.addFinalizer(() => consumer.stop.pipe(Effect.andThen(consumer.awaitIdle)));

  return consumer;
});
