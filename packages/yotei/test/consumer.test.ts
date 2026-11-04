import { expect, it } from "bun:test";
import { Deferred, Effect, Exit, Fiber, Option, Scope } from "effect";
import { TestClock } from "effect/testing";

import { makeConsumer } from "../src/consumer";

it("bounds attempts, skips busy polls, and joins admitted work on scope exit", () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const scope = yield* Scope.make();
      const release = yield* Deferred.make<boolean>();
      let calls = 0;
      const consumer = yield* makeConsumer(
        {
          consume: () =>
            Effect.suspend(() => {
              calls++;
              return Deferred.await(release);
            }),
        },
        () => Effect.succeed(true),
        { maxInFlight: 2, pollIntervalMs: 10 },
      ).pipe(Scope.provide(scope));
      yield* TestClock.adjust(9);
      expect(calls).toBe(0);
      yield* TestClock.adjust(101);
      expect(calls).toBe(2);
      yield* consumer.stop;
      const waiting = yield* consumer.awaitIdle.pipe(Effect.timeoutOption(10), Effect.forkChild);
      yield* TestClock.adjust(10);
      expect(Option.isNone(yield* Fiber.join(waiting))).toBe(true);
      const closing = yield* Scope.close(scope, Exit.void).pipe(Effect.forkChild);
      yield* TestClock.adjust(100);
      expect(closing.pollUnsafe()).toBeUndefined();
      expect(calls).toBe(2);
      yield* Deferred.succeed(release, true);
      yield* Fiber.join(closing);
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
  ));
