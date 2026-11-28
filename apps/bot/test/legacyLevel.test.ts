import { describe, expect, it } from "bun:test";
import { Collection, type Client, type Guild, type GuildMember } from "discord.js";
import { Effect, Exit, Layer, Scope } from "effect";
import { TestClock } from "effect/testing";

import {
  expForLevel,
  type LegacyTier,
  legacyProgress,
  levelFromExp,
  tierFor,
  tierRoleChanges,
} from "../src/legacyLevel/curve";
import { LegacyLevel } from "../src/legacyLevel/service";
import * as TierSync from "../src/legacyLevel/tierSync";

const GUILD_ID = "g1";
const tiers: LegacyTier[] = [
  { minLevel: 20, roleId: "tier-20" },
  { minLevel: 5, roleId: "tier-5" },
];

const mockMember = (id: string, roles: string[], fail = false) => {
  const calls: string[][] = [];
  const member = {
    id,
    guild: { id: GUILD_ID },
    roles: {
      cache: new Collection(roles.map((r) => [r, { id: r }])),
      set: async (next: string[]) => {
        calls.push(next);
        if (fail) throw new Error("boom");
        return member;
      },
    },
  } as unknown as GuildMember;
  return { member, calls };
};

const mockGuild = (roleIds: string[], cached: GuildMember[], fetchable: GuildMember[] = []) => {
  const fetches: string[][] = [];
  const byId = new Map(fetchable.map((m) => [m.id, m]));
  const guild = {
    id: GUILD_ID,
    roles: { cache: new Collection(roleIds.map((id) => [id, { id }])) },
    members: {
      cache: new Collection(cached.map((m) => [m.id, m])),
      fetch: async ({ user }: { user: string[] }) => {
        fetches.push(user);
        return new Collection(
          user.flatMap((id) => {
            const m = byId.get(id);
            return m ? ([[id, m]] as const) : [];
          }),
        );
      },
    },
  } as unknown as Guild;
  return { guild, fetches };
};

const mockLegacyLevel = (levels: Record<string, number>, guildTiers = tiers) =>
  Layer.succeed(LegacyLevel, {
    progress: (_, userIds) =>
      Effect.succeed(
        new Map(
          userIds.map((id) => {
            const p = legacyProgress(expForLevel(levels[id] ?? 0));
            return [id, { ...p, importedExp: p.exp }];
          }),
        ),
      ),
    userProgress: (_, id) => {
      const p = legacyProgress(expForLevel(levels[id] ?? 0));
      return Effect.succeed({ ...p, importedExp: p.exp });
    },
    tiers: () => Effect.succeed(guildTiers),
  });

describe("legacyLevel curve", () => {
  it("computes levels, clamps negative exp, and picks tier role changes", () => {
    expect(levelFromExp(274)).toBe(4);
    expect(levelFromExp(275)).toBe(5);
    expect(legacyProgress(-10)).toEqual({ exp: 0, level: 0, current: 0, target: 11 });
    expect(tierFor(25, tiers)).toEqual({ minLevel: 20, roleId: "tier-20" });
    expect(tierFor(4, tiers)).toBeUndefined();
    expect(tierFor(0, [{ minLevel: 0, roleId: "tier-0" }, ...tiers])).toEqual({
      minLevel: 0,
      roleId: "tier-0",
    });
    expect(tierRoleChanges(new Set(["custom", "tier-5"]), tiers, 20)).toEqual({
      add: ["tier-20"],
      remove: ["tier-5"],
    });
  });
});

describe("TierSync", () => {
  it("replaces tier roles in one roles.set call, skips deleted roles, and isolates failures", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* TierSync.TierSync;
        const upgraded = mockMember("u1", [GUILD_ID, "custom", "tier-5"]);
        const failing = mockMember("u2", [GUILD_ID], true);
        const deletedTier = mockMember("u3", [GUILD_ID]);
        const { guild, fetches } = mockGuild(
          [GUILD_ID, "custom", "tier-5", "tier-20"],
          [failing.member],
          [upgraded.member, deletedTier.member],
        );

        const changed = yield* sync.syncMembers(guild, ["u1", "u2", "u3", "u1"]);
        expect(fetches).toEqual([["u1", "u3"]]);
        expect(changed).toBe(1);
        expect(upgraded.calls).toEqual([["custom", "tier-20"]]);
        expect(deletedTier.calls).toEqual([]);
      }).pipe(
        Effect.provide(
          TierSync.layer.pipe(
            Layer.provide(
              mockLegacyLevel({ u1: 20, u2: 5, u3: 50 }, [
                ...tiers,
                { minLevel: 50, roleId: "deleted" },
              ]),
            ),
          ),
        ),
      ),
    ));

  it("defers fresh marks until writes settle and stops on scope exit", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const sync = yield* TierSync.make.pipe(Scope.provide(scope));
        const u1 = mockMember("u1", [GUILD_ID]);
        const u2 = mockMember("u2", [GUILD_ID]);
        const { guild } = mockGuild([GUILD_ID, "tier-5"], [u1.member, u2.member]);
        const client = {
          guilds: { cache: new Collection([[GUILD_ID, guild]]) },
        } as unknown as Client;

        yield* sync.start(client);
        yield* sync.start(client); // idempotent

        yield* sync.mark(GUILD_ID, ["u1"]);
        yield* TestClock.adjust("30 seconds");
        expect(u1.calls).toEqual([["tier-5"]]);

        // Marked 5s before the next tick -> deferred until the following tick
        yield* TestClock.adjust("25 seconds");
        yield* sync.mark(GUILD_ID, ["u2"]);
        yield* TestClock.adjust("5 seconds");
        expect(u2.calls).toEqual([]);

        yield* TestClock.adjust("30 seconds");
        expect(u2.calls).toEqual([["tier-5"]]);

        yield* Scope.close(scope, Exit.void);
        yield* sync.mark(GUILD_ID, ["u1"]);
        yield* TestClock.adjust("60 seconds");
        expect(u1.calls).toHaveLength(1);
      }).pipe(
        Effect.scoped,
        Effect.provide(Layer.merge(TestClock.layer(), mockLegacyLevel({ u1: 5, u2: 5 }))),
      ),
    ));
});
