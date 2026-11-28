import { Context, Data, Effect, Layer, Predicate, Ref, Schema, Scope } from "effect";

import { type ConsumerOptions, makeConsumer } from "./consumer";
import { QueueStore } from "./persistence";

export class QueueAlreadyRunningError extends Data.TaggedError("QueueAlreadyRunningError")<{}> {
  override readonly message = "MessageQueue is already running";
}

export type QueueHandler = (data: unknown) => Effect.Effect<void, unknown>;
export type ResolveHandler = (type: string) => QueueHandler | undefined;

const Envelope = Schema.Struct({
  type: Schema.String,
  data: Schema.Unknown.check(Schema.makeFilter(Predicate.isNotNullish)),
});

const dispatch = (resolveHandler: ResolveHandler) =>
  Effect.fn("yotei.dispatch")(
    function* (task: { data: unknown }) {
      const { type, data } = yield* Schema.decodeUnknownEffect(Envelope)(task.data);
      const handler = resolveHandler(type);
      if (!handler) {
        yield* Effect.logWarning(`No handler registered for task type "${type}"`);
        return false;
      }
      yield* handler(data);
      return true;
    },
    Effect.catchCause((cause) => Effect.logError(cause).pipe(Effect.as(false))),
  );

export const make = Effect.gen(function* () {
  const store = yield* QueueStore;
  const scope = yield* Effect.scope;
  const started = yield* Ref.make(false);

  return {
    push: store.createTask.bind(store),
    cancel: store.cancelTask.bind(store),
    updateDelay: store.updateTaskDelay.bind(store),
    startConsumer: Effect.fn("yotei.startConsumer")(function* (
      resolveHandler: ResolveHandler,
      options: typeof ConsumerOptions.Type,
    ) {
      if (yield* Ref.getAndSet(started, true)) {
        return yield* new QueueAlreadyRunningError();
      }

      return yield* makeConsumer(store, dispatch(resolveHandler), options).pipe(
        Scope.provide(scope),
        Effect.onError(() => Ref.set(started, false)),
      );
    }, Effect.uninterruptible),
  };
});

export type Service = Effect.Success<typeof make>;
export class Queue extends Context.Service<Queue, Service>()("@hashira/yotei/Queue") {}
export const layer: Layer.Layer<Queue, never, QueueStore> = Layer.effect(Queue, make);
