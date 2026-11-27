import { Context, Data, type Effect } from "effect";

import type { LegacyProgress, LegacyTier } from "./curve";

export type LegacyUserProgress = LegacyProgress & { importedExp: number };

export class LegacyLevelError extends Data.TaggedError("LegacyLevelError")<{
  readonly cause: unknown;
}> {}

export interface Service {
  /** Progress for every given user, including users without any experience */
  progress(
    guildId: string,
    userIds: readonly string[],
  ): Effect.Effect<Map<string, LegacyUserProgress>, LegacyLevelError>;
  userProgress(
    guildId: string,
    userId: string,
  ): Effect.Effect<LegacyUserProgress, LegacyLevelError>;
  tiers(guildId: string): Effect.Effect<LegacyTier[], LegacyLevelError>;
}

export class LegacyLevel extends Context.Service<LegacyLevel, Service>()(
  "@hashira/bot/LegacyLevel",
) {}
