import { type Client, type Guild, type GuildMember, RESTJSONErrorCodes } from "discord.js";
import { Clock, Context, Data, Effect, Layer, Queue, Schedule, Semaphore } from "effect";
import { chunk, uniq } from "es-toolkit";

import { discordTry } from "../util/discordTry";
import { fetchMembers } from "../util/fetchMembers";
import { tierRoleChanges } from "./curve";
import { LegacyLevel, type LegacyLevelError } from "./service";

const SYNC_INTERVAL = "30 seconds";
// UserTextActivityQueue flushes every 15s; wait slightly longer so triggering messages reach Postgres first
const MARK_SETTLE_DELAY_MS = 20_000;
const PROGRESS_BATCH_SIZE = 1_000;
const ROLE_CHANGE_REASON = "Legacy level";

type MarkEntry = readonly [guildId: string, userId: string, readyAt: number];

export class TierSyncError extends Data.TaggedError("TierSyncError")<{
  readonly cause: unknown;
}> {}

export interface Service {
  /** Remember users whose activity changed; they are synced once their writes settle */
  mark(guildId: string, userIds: readonly string[]): Effect.Effect<void>;
  /** Give each member the role of their tier; returns how many members changed */
  syncMembers(guild: Guild, userIds: readonly string[]): Effect.Effect<number, LegacyLevelError>;
  /** Start the periodic background sync loop once, scoped to the TierSync layer */
  start(client: Client): Effect.Effect<void>;
}

export class TierSync extends Context.Service<TierSync, Service>()("@hashira/bot/LegacyTierSync") {}

const attempt = <A>(body: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: body, catch: (cause) => new TierSyncError({ cause }) });

const applyRoleChanges = (
  member: GuildMember,
  add: readonly string[],
  remove: readonly string[],
) => {
  const removeSet = new Set(remove);
  const nextRoles = [
    ...[...member.roles.cache.keys()].filter((id) => id !== member.guild.id && !removeSet.has(id)),
    ...add,
  ];
  return attempt(() =>
    discordTry(
      async () => {
        await member.roles.set(nextRoles, ROLE_CHANGE_REASON);
        return true;
      },
      [RESTJSONErrorCodes.MissingPermissions, RESTJSONErrorCodes.UnknownRole],
      () => false,
    ),
  );
};

export const make = Effect.gen(function* () {
  const legacyLevel = yield* LegacyLevel;
  const scope = yield* Effect.scope;
  const queue = yield* Queue.unbounded<MarkEntry>();
  const starting = yield* Semaphore.make(1);

  const syncMembers: Service["syncMembers"] = Effect.fn("TierSync.syncMembers")(
    function* (guild, userIds) {
      const uniqueIds = uniq(userIds);
      if (uniqueIds.length === 0) return 0;

      const tiers = yield* legacyLevel.tiers(guild.id);
      if (tiers.length === 0) return 0;

      const counts = yield* Effect.forEach(chunk(uniqueIds, PROGRESS_BATCH_SIZE), (batch) =>
        Effect.gen(function* () {
          const missing = batch.filter((id) => !guild.members.cache.has(id));
          const [progress, fetched] = yield* Effect.all(
            [
              legacyLevel.progress(guild.id, batch),
              missing.length > 0
                ? attempt(() => fetchMembers(guild, missing)).pipe(
                    Effect.catch((error) =>
                      Effect.logError(
                        `Legacy tier member fetch failed in guild ${guild.id}`,
                        error,
                      ).pipe(Effect.as(new Map<string, GuildMember>())),
                    ),
                  )
                : Effect.succeed(new Map<string, GuildMember>()),
            ],
            { concurrency: "unbounded" },
          );

          const results = yield* Effect.forEach(batch, (userId) => {
            const member = guild.members.cache.get(userId) ?? fetched.get(userId);
            if (!member) return Effect.succeed(false);

            const { add, remove } = tierRoleChanges(
              new Set(member.roles.cache.keys()),
              tiers,
              progress.get(userId)?.level ?? 0,
            );
            const validAdd = add.filter((roleId) => guild.roles.cache.has(roleId));
            if (validAdd.length === 0 && remove.length === 0) return Effect.succeed(false);

            return applyRoleChanges(member, validAdd, remove).pipe(
              Effect.catch((error) =>
                Effect.logError(`Legacy tier sync failed for ${userId}`, error).pipe(
                  Effect.as(false),
                ),
              ),
            );
          });

          return results.filter(Boolean).length;
        }),
      );

      return counts.reduce((sum, count) => sum + count, 0);
    },
  );

  const syncMarked = Effect.fn("TierSync.syncMarked")(function* (client: Client) {
    const entries = yield* Queue.clear(queue);
    if (entries.length === 0) return;

    const now = yield* Clock.currentTimeMillis;
    const due = new Map<string, Set<string>>();
    const deferred: MarkEntry[] = [];

    for (const entry of entries) {
      const [guildId, userId, readyAt] = entry;
      if (readyAt > now) {
        deferred.push(entry);
      } else {
        const users = due.get(guildId) ?? new Set<string>();
        users.add(userId);
        due.set(guildId, users);
      }
    }

    if (deferred.length > 0) yield* Queue.offerAll(queue, deferred);

    yield* Effect.forEach(
      due,
      ([guildId, userIds]) => {
        const guild = client.guilds.cache.get(guildId);
        return guild
          ? syncMembers(guild, [...userIds]).pipe(
              Effect.catchCause((cause) => Effect.logError("Legacy tier sync failed", cause)),
            )
          : Effect.void;
      },
      { discard: true },
    );
  });

  return TierSync.of({
    mark: (guildId, userIds) =>
      userIds.length === 0
        ? Effect.void
        : Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) =>
              Queue.offerAll(
                queue,
                userIds.map((userId) => [guildId, userId, now + MARK_SETTLE_DELAY_MS] as const),
              ),
            ),
            Effect.asVoid,
          ),
    syncMembers,
    start: Effect.fn("TierSync.start")(function* (client) {
      if (!(yield* Semaphore.takeIfAvailable(starting, 1))) return;
      yield* syncMarked(client).pipe(
        Effect.schedule(Schedule.spaced(SYNC_INTERVAL)),
        Effect.forkIn(scope),
      );
    }, Effect.uninterruptible),
  });
});

export const layer = Layer.effect(TierSync, make);
