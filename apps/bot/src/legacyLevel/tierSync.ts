import { type Client, type Guild, type GuildMember, RESTJSONErrorCodes } from "discord.js";
import { Context, Effect, Layer, Ref } from "effect";
import { chunk } from "es-toolkit";

import { discordTry } from "../util/discordTry";
import { tierRoleChanges } from "./curve";
import { LegacyLevel, LegacyLevelError } from "./legacyLevel";

const SYNC_INTERVAL = "30 seconds";
const PROGRESS_BATCH_SIZE = 1_000;
const ROLE_CHANGE_REASON = "Legacy level";

export interface Service {
  /** Remember users whose activity changed; they are synced on the next tick */
  mark(guildId: string, userIds: readonly string[]): Effect.Effect<void>;
  /** Give each member the role of their tier; returns how many members changed */
  syncMembers(guild: Guild, userIds: readonly string[]): Effect.Effect<number, LegacyLevelError>;
  /** Sync marked users forever */
  run(client: Client): Effect.Effect<never>;
}

export class TierSync extends Context.Service<TierSync, Service>()("@hashira/bot/LegacyTierSync") {}

const attempt = <A>(body: () => PromiseLike<A>) =>
  Effect.tryPromise({
    try: body,
    catch: (cause) => new LegacyLevelError({ cause }),
  });

const fetchMember = (guild: Guild, userId: string) => {
  const cached = guild.members.cache.get(userId);
  if (cached) return Effect.succeed<GuildMember | null>(cached);
  return attempt(() =>
    discordTry(
      () => guild.members.fetch(userId),
      [RESTJSONErrorCodes.UnknownMember],
      async () => null,
    ),
  );
};

const applyRoleChanges = (member: GuildMember, add: string[], remove: string[]) =>
  Effect.gen(function* () {
    if (remove.length > 0) yield* attempt(() => member.roles.remove(remove, ROLE_CHANGE_REASON));
    if (add.length > 0) yield* attempt(() => member.roles.add(add, ROLE_CHANGE_REASON));
  });

export const make = Effect.gen(function* () {
  const legacyLevel = yield* LegacyLevel;
  const marked = yield* Ref.make(new Map<string, Set<string>>());

  const syncMembers: Service["syncMembers"] = Effect.fnUntraced(function* (guild, userIds) {
    const tiers = yield* legacyLevel.tiers(guild.id);
    if (tiers.length === 0) return 0;

    let changed = 0;
    for (const batch of chunk([...userIds], PROGRESS_BATCH_SIZE)) {
      const progress = yield* legacyLevel.progress(guild.id, batch);
      for (const userId of batch) {
        const member = yield* fetchMember(guild, userId);
        if (!member) continue;

        const { add, remove } = tierRoleChanges(
          new Set(member.roles.cache.keys()),
          tiers,
          progress.get(userId)?.level ?? 0,
        );
        if (add.length === 0 && remove.length === 0) continue;

        yield* applyRoleChanges(member, add, remove).pipe(
          Effect.tap(() => Effect.sync(() => changed++)),
          Effect.catch((error) => Effect.logError(`Legacy tier sync failed for ${userId}`, error)),
        );
      }
    }
    return changed;
  });

  const syncMarked = (client: Client) =>
    Effect.gen(function* () {
      const pending = yield* Ref.getAndSet(marked, new Map());
      for (const [guildId, userIds] of pending) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;
        yield* syncMembers(guild, [...userIds]).pipe(
          Effect.catchCause((cause) => Effect.logError("Legacy tier sync failed", cause)),
        );
      }
    });

  return TierSync.of({
    mark: (guildId, userIds) =>
      Ref.update(marked, (current) => {
        const next = new Map(current);
        next.set(guildId, new Set([...(current.get(guildId) ?? []), ...userIds]));
        return next;
      }),
    syncMembers,
    // Messages reach the database up to ~15s after they are sent, so a member synced
    // before their last message was stored catches up on their next activity.
    run: (client) =>
      syncMarked(client).pipe(Effect.andThen(Effect.sleep(SYNC_INTERVAL)), Effect.forever),
  });
});

export const layer = Layer.effect(TierSync, make);
