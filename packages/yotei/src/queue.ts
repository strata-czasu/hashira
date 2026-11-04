import { Context, Effect, Layer, Predicate, Schema, Scope, Semaphore } from "effect";

import { type ConsumerOptions, makeConsumer } from "./consumer";
import { QueueStore } from "./persistence";

export class QueueAlreadyRunningError extends Schema.TaggedError<QueueAlreadyRunningError>()(
  "QueueAlreadyRunningError",
  {},
) {
  override readonly message = "MessageQueue is already running";
}

export type QueueHandler = (data: unknown) => Effect.Effect<void, unknown>;
export type ResolveHandler = (type: string) => QueueHandler | undefined;

const Envelope = Schema.Struct({
  type: Schema.String,
  data: Schema.Unknown.check(Schema.makeFilter(Predicate.isNotNullish)),
});

const dispatch = (resolveHandler: ResolveHandler) =>
  Effect.fnUntraced(
    function* (task: { data: unknown }) {
      const { type, data } = yield* Schema.decodeUnknownEffect(Envelope)(task.data);
      const handler = resolveHandler(type);
      if (!handler) return false;
      yield* handler(data);
      return true;
    },
    Effect.catchCause((cause) => Effect.logError(cause).pipe(Effect.as(false))),
  );

export const make = Effect.gen(function* () {
  const store = yield* QueueStore;
  const scope = yield* Effect.scope;
  const starting = yield* Semaphore.make(1);

  return {
    push: store.createTask.bind(store),
    cancel: store.cancelTask.bind(store),
    updateDelay: store.updateTaskDelay.bind(store),
    startConsumer: Effect.fnUntraced(function* (
      resolveHandler: ResolveHandler,
      options: typeof ConsumerOptions.Type,
    ) {
      if (!(yield* Semaphore.takeIfAvailable(starting, 1))) {
        return yield* new QueueAlreadyRunningError();
      }

      return yield* makeConsumer(store, dispatch(resolveHandler), options).pipe(
        Scope.provide(scope),
        Effect.onError(() => Semaphore.release(starting, 1)),
      );
    }, Effect.uninterruptible),
  };
});

export type Service = Effect.Success<typeof make>;
export class Queue extends Context.Service<Queue, Service>()("@hashira/yotei/Queue") {}
export const layer = (persistence: Layer.Layer<QueueStore>) =>
  Layer.effect(Queue, make).pipe(Layer.provide(persistence));
