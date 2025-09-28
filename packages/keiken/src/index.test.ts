import { expect, test } from "bun:test";
import { expectTypeOf } from "expect-type";
import { type ActivityBaseContext, type ActivityScope, Keiken } from "./index";

const defaultScope = { guildId: "", userId: "", channelId: "", roleIds: [] };
const defaultContext = { weight: 1 };

test("can create a Keiken instance", () => {
  expect(() => new Keiken()).not.toThrow();
});

test("can add an activity", () => {
  const keiken = new Keiken().addActivity("quest", (activity) =>
    activity.handle((ctx) => {
      expectTypeOf(ctx).toExtend<ActivityBaseContext>();
      return { experience: 10 };
    }),
  );

  expect(keiken).toBeInstanceOf(Keiken);
});

test("can add multiple activities", async () => {
  const keiken = new Keiken()
    .addActivity("quest", (activity) => activity.handle(() => ({ experience: 10 })))
    .addActivity("battle", (activity) => activity.handle(() => ({ experience: 20 })));

  expect(keiken).toBeInstanceOf(Keiken);
  const result = await keiken.performActivity("quest", defaultContext, defaultScope);
  expect(result).toEqual({ experience: 10 });
});

test("context can be extended and is type safe", async () => {
  const keiken = new Keiken()
    .extendContext({ serverMultiplier: 2 })
    .extendContext(() => ({ bonus: 5 }))
    .addActivity("quest", (activity) =>
      activity.handle((ctx) => {
        expectTypeOf(ctx.serverMultiplier).toEqualTypeOf<number>();
        expectTypeOf(ctx.bonus).toEqualTypeOf<number>();
        return { experience: (10 + ctx.bonus) * ctx.serverMultiplier };
      }),
    );

  const outcome = await keiken.performActivity("quest", defaultContext, defaultScope);
  expect(outcome.experience).toBe(30); // (10 + 5) * 2
});

test("later extendContext overrides earlier keys", async () => {
  const keiken = new Keiken()
    .extendContext({ value: 1 })
    .extendContext({ value: 2 })
    .addActivity("a", (activity) =>
      activity.handle((ctx) => ({ experience: ctx.value })),
    );

  const result = await keiken.performActivity("a", defaultContext, defaultScope);
  expect(result.experience).toBe(2);
});

async function fetchGuildMultiplier(scope: ActivityScope) {
  return { guildMultiplier: scope.guildId === "g1" ? 2 : 1 };
}

async function fetchUserGuildMultiplier(scope: ActivityScope) {
  return { userGuildMultiplier: 3 };
}

test("async providers and scope merge correctly", async () => {
  const k = new Keiken()
    .extendContext(fetchGuildMultiplier)
    .extendContext(fetchUserGuildMultiplier)
    .addActivity("quest", (a) =>
      a.handle((ctx) => {
        return { experience: 10 * ctx.guildMultiplier * ctx.userGuildMultiplier };
      }),
    );

  const out = await k.performActivity("quest", defaultContext, {
    guildId: "g1",
    userId: "u1",
    channelId: "",
    roleIds: [],
  });
  expect(out.experience).toBe(10 * 2 * 3);
});

test("async providers without scope fallback", async () => {
  const k = new Keiken()
    .extendContext(fetchGuildMultiplier)
    .addActivity("quest", (a) =>
      a.handle((ctx) => ({ experience: 5 * ctx.guildMultiplier })),
    );

  const out = await k.performActivity(
    "quest",
    { weight: 1 },
    { guildId: "g2", userId: "u1", channelId: "", roleIds: [] },
  );

  expect(out.experience).toBe(5 * 1);
});
