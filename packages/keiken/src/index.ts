import type { Prettify } from "@hashira/utils/types";

export interface ActivityBaseContext {
  weight: number;
}

export interface ActivityOutcome {
  experience: number;
}

export class Activity<
  Type,
  const HasHandler extends boolean = false,
  GlobalContext = NonNullable<unknown>,
> {
  protected declare readonly nominal: [HasHandler];
  #handler?: (context: ActivityBaseContext & GlobalContext) => ActivityOutcome;

  handle(
    handler: (context: ActivityBaseContext & GlobalContext) => ActivityOutcome,
  ): Activity<Type, true, GlobalContext> {
    this.#handler = handler;
    return this as unknown as ReturnType<typeof this.handle>;
  }

  run(context: ActivityBaseContext & GlobalContext): ActivityOutcome {
    if (!this.#handler) throw new Error("Activity has no handler");
    return this.#handler(context);
  }
}

type BaseActivity = Activity<string, true, Record<string, unknown>>;
type BaseActivities = { [key: string]: BaseActivity };
const initialActivities = {} as const;

export interface ActivityScope {
  guildId: string;
  userId: string;
  channelId: string;
  roleIds: string[];
}

type Provider<Context extends { [key: string]: unknown }> = (
  scope: ActivityScope,
) => Promise<Context> | Context;

export class Keiken<
  Activities extends BaseActivities = typeof initialActivities,
  GlobalContext = NonNullable<unknown>,
> {
  #activities: Record<string, BaseActivity>;
  #contextProviders: Provider<Record<string, unknown>>[];

  constructor() {
    this.#activities = {};
    this.#contextProviders = [];
  }

  addActivity<K extends string>(
    type: K,
    builder: (
      activity: Activity<K, false, GlobalContext>,
    ) => Activity<K, true, GlobalContext>,
  ): Keiken<
    Prettify<Activities & { [P in K]: Activity<K, true, GlobalContext> }>,
    GlobalContext
  > {
    this.#activities[type as string] = builder(
      new Activity<K, false, GlobalContext>(),
    ) as BaseActivity;

    return this as unknown as ReturnType<typeof this.addActivity<K>>;
  }

  extendContext<C extends { [key: string]: unknown }>(
    ctx: C,
  ): Keiken<Activities, Prettify<GlobalContext & C>>;
  extendContext<C extends { [key: string]: unknown }>(
    provider: Provider<C>,
  ): Keiken<Activities, Prettify<GlobalContext & C>>;
  extendContext<C extends { [key: string]: unknown }>(
    ctxOrProvider: C | Provider<C>,
  ): Keiken<Activities, Prettify<GlobalContext & C>> {
    const provider =
      typeof ctxOrProvider === "function" ? ctxOrProvider : () => ctxOrProvider;

    this.#contextProviders.push(provider as Provider<Record<string, unknown>>);

    return this as unknown as ReturnType<typeof this.extendContext<C>>;
  }

  async performActivity<K extends keyof Activities>(
    type: K,
    context: ActivityBaseContext & Partial<GlobalContext>,
    scope: ActivityScope,
  ): Promise<ActivityOutcome> {
    const activity = this.#activities[type as string];

    if (!activity) throw new Error(`Activity "${String(type)}" not found`);

    const globalParts = await Promise.all(
      this.#contextProviders.map((provider) => Promise.try(() => provider(scope))),
    );

    const mergedGlobal = Object.assign({}, ...globalParts) as GlobalContext;

    const merged = { ...mergedGlobal, ...context };

    return activity.run(merged);
  }
}
