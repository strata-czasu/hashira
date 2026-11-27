import { Context, Effect, Layer, Schema } from "effect";

import type { ExtendedPrismaClient } from "@hashira/db";

import { getUsersTextActivity, getUsersVoiceActivity } from "../userActivity/util";
import { type LegacyProgress, type LegacyTier, legacyProgress } from "./curve";

/** The old bot stopped tracking at 04:00 Warsaw time; later activity comes from our own tables */
export const LEGACY_LEVEL_ACCRUE_SINCE = new Date("2026-08-04T02:00:00Z");

export class LegacyLevelError extends Schema.TaggedError<LegacyLevelError>()("LegacyLevelError", {
  cause: Schema.Unknown,
}) {}

export interface Service {
  /** Progress for every given user, including users without any experience */
  progress(
    guildId: string,
    userIds: readonly string[],
  ): Effect.Effect<Map<string, LegacyProgress>, LegacyLevelError>;
  tiers(guildId: string): Effect.Effect<LegacyTier[], LegacyLevelError>;
}

export class LegacyLevel extends Context.Service<LegacyLevel, Service>()(
  "@hashira/bot/LegacyLevel",
) {}

const attempt = <A>(body: () => PromiseLike<A>) =>
  Effect.tryPromise({
    try: body,
    catch: (cause) => new LegacyLevelError({ cause }),
  });

export const make = (prisma: ExtendedPrismaClient): Service => ({
  progress: Effect.fnUntraced(function* (guildId, userIds) {
    if (userIds.length === 0) return new Map();
    const ids = [...userIds];

    const ignoredChannels = yield* attempt(() =>
      prisma.legacyLevelIgnoredChannel.findMany({
        where: { guildId },
        select: { channelId: true },
      }),
    );
    const activity = {
      prisma,
      guildId,
      userIds: ids,
      since: LEGACY_LEVEL_ACCRUE_SINCE,
      excludeChannelIds: ignoredChannels.map(({ channelId }) => channelId),
    };

    const [imported, textMessages, voiceSeconds] = yield* Effect.all(
      [
        attempt(() =>
          prisma.legacyExperience.findMany({ where: { guildId, userId: { in: ids } } }),
        ),
        attempt(() => getUsersTextActivity(activity)),
        attempt(() => getUsersVoiceActivity(activity)),
      ],
      { concurrency: "unbounded" },
    );

    const importedExp = new Map(imported.map((row) => [row.userId, row.importedExp]));
    return new Map(
      ids.map((userId) => {
        const exp =
          (importedExp.get(userId) ?? 0) +
          (textMessages.get(userId) ?? 0) +
          Math.floor((voiceSeconds.get(userId) ?? 0) / 60);
        return [userId, legacyProgress(exp)];
      }),
    );
  }),
  tiers: (guildId) =>
    attempt(() =>
      prisma.legacyLevelRole.findMany({
        where: { guildId },
        select: { minLevel: true, roleId: true },
        orderBy: { minLevel: "asc" },
      }),
    ),
});

export const layer = (prisma: ExtendedPrismaClient) => Layer.succeed(LegacyLevel, make(prisma));
