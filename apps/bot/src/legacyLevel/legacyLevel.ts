import { Effect, Layer } from "effect";
import { uniq } from "es-toolkit";

import type { ExtendedPrismaClient } from "@hashira/db";

import { getUsersTextActivity, getUsersVoiceActivity } from "../userActivity/util";
import { legacyProgress } from "./curve";
import { LegacyLevel, LegacyLevelError, type Service } from "./service";

export { LegacyLevel, LegacyLevelError, type LegacyUserProgress, type Service } from "./service";

/** The old bot stopped tracking at 04:00 Warsaw time; later activity comes from our own tables */
export const LEGACY_LEVEL_ACCRUE_SINCE = new Date("2026-08-04T02:00:00Z");

const attempt = <A>(body: () => PromiseLike<A>) =>
  Effect.tryPromise({ try: body, catch: (cause) => new LegacyLevelError({ cause }) });

export const make = (prisma: ExtendedPrismaClient): Service => {
  const progress: Service["progress"] = Effect.fn("LegacyLevel.progress")(
    function* (guildId, userIds) {
      const ids = uniq(userIds);
      if (ids.length === 0) return new Map();

      const [ignoredChannels, imported] = yield* Effect.all(
        [
          attempt(() =>
            prisma.legacyLevelIgnoredChannel.findMany({
              where: { guildId },
              select: { channelId: true },
            }),
          ),
          attempt(() =>
            prisma.legacyExperience.findMany({ where: { guildId, userId: { in: ids } } }),
          ),
        ],
        { concurrency: "unbounded" },
      );

      const activity = {
        prisma,
        guildId,
        userIds: ids,
        since: LEGACY_LEVEL_ACCRUE_SINCE,
        excludeChannelIds: ignoredChannels.map(({ channelId }) => channelId),
      };
      const [textMessages, voiceSeconds] = yield* Effect.all(
        [
          attempt(() => getUsersTextActivity(activity)),
          attempt(() => getUsersVoiceActivity(activity)),
        ],
        { concurrency: "unbounded" },
      );

      const importedByUser = new Map(imported.map((row) => [row.userId, row.importedExp]));
      return new Map(
        ids.map((userId) => {
          const importedExp = importedByUser.get(userId) ?? 0;
          const exp =
            importedExp +
            (textMessages.get(userId) ?? 0) +
            Math.floor((voiceSeconds.get(userId) ?? 0) / 60);
          return [userId, { ...legacyProgress(exp), importedExp }];
        }),
      );
    },
  );

  return LegacyLevel.of({
    progress,
    userProgress: (guildId, userId) =>
      progress(guildId, [userId]).pipe(
        Effect.map((map) => map.get(userId) ?? { ...legacyProgress(0), importedExp: 0 }),
      ),
    tiers: (guildId) =>
      attempt(() =>
        prisma.legacyLevelRole.findMany({
          where: { guildId },
          select: { minLevel: true, roleId: true },
          orderBy: { minLevel: "asc" },
        }),
      ),
  });
};

export const layer = (prisma: ExtendedPrismaClient) => Layer.succeed(LegacyLevel, make(prisma));
