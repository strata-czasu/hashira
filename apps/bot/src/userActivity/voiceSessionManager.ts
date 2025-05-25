import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { differenceInSeconds } from "date-fns";
import type { Guild, VoiceState } from "discord.js";
import { pick } from "es-toolkit";
import * as v from "valibot";
import { ensureUserExists } from "../util/ensureUsersExist";

export enum CoreVoiceState {
  Muted = 1 << 0, // 1
  Deafened = 1 << 1, // 2
  Streaming = 1 << 2, // 4
  Video = 1 << 3, // 8
}

const BooleanString = v.pipe(
  v.string(),
  v.union([v.literal("true"), v.literal("false")]),
  v.transform((v) => v === "true"),
);

const NumberString = v.pipe(
  v.string(),
  v.decimal(),
  v.transform((v) => Number(v)),
);

const DateString = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.transform((v) => new Date(v)),
);

// Old schemas removed/commented out as per refactoring plan
// const voiceSessionSchemaV1 = v.object({ ... });
// const voiceSessionSchemaV2 = v.object({ ... });
// const AnyVersionVoiceSessionSchema = v.union([ ... ]);
// type AnyVersionVoiceSessionSchema = v.InferOutput<typeof AnyVersionVoiceSessionSchema>;

const ActiveVoiceSessionRedisSchema = v.object({
  channelId: v.string(),
  joinedAt: DateString,
  lastCombinationStartTime: DateString,
  activeBitmask: NumberString,
  version: v.literal("3"),
});
type VoiceSession = v.InferOutput<typeof ActiveVoiceSessionRedisSchema>; // Updated type alias

const VERSION: VoiceSession["version"] = "3"; // Updated version

export class VoiceSessionManager {
  private redis: RedisClient;
  private prisma: ExtendedPrismaClient;

  constructor(redis: RedisClient, prisma: ExtendedPrismaClient) {
    this.redis = redis;
    this.prisma = prisma;
  }

  private getSessionKey(guildId: string, userId: string): string {
    return `voiceSession:${guildId}:${userId}`;
  }

  private getCurrentVoiceSubstatesKey(guildId: string, userId: string): string {
    return `currentVoiceSubstates:${guildId}:${userId}`;
  }

  private getBufferedActivitiesKey(guildId: string, userId: string): string {
    return `bufferedVoiceActivities:${guildId}:${userId}`;
  }

  private tryUpdateSession(sessionRaw: Record<string, string>): VoiceSession | null {
    // Attempt to parse against the new schema.
    // This method no longer migrates old versions.
    // It expects data to conform to ActiveVoiceSessionRedisSchema or it's considered invalid.
    const sessionResult = v.safeParse(ActiveVoiceSessionRedisSchema, sessionRaw);

    if (!sessionResult.success) {
      // It's important to know what kind of data we are failing to parse.
      // If it's an older version, it's less critical than if it's garbage data.
      const version = sessionRaw.version;
      if (version && (version === "1" || version === "2")) {
        console.warn(
          `Old voice session version (v${version}) found for key. Discarding. Data: ${JSON.stringify(sessionRaw)}`,
        );
      } else {
        const flatIssues = v.flatten(sessionResult.issues);
        console.error(
          `Invalid voice session data encountered: ${JSON.stringify(flatIssues)}. Data: ${JSON.stringify(sessionRaw)}`,
        );
      }
      return null; // Return null if parsing fails or data is from an old, non-migrated version.
    }

    // Ensure the version in Redis matches the current code version.
    // This check is somewhat redundant if safeParse against ActiveVoiceSessionRedisSchema (which has a literal version) passes,
    // but it's a good safeguard.
    if (sessionResult.output.version !== VERSION) {
      console.warn(
        `Voice session version mismatch (expected v${VERSION}, got v${sessionResult.output.version}). Discarding. Data: ${JSON.stringify(sessionRaw)}`,
      );
      return null;
    }

    return sessionResult.output;
  }

  async getVoiceSession(guildId: string, userId: string): Promise<VoiceSession | null> {
    const key = this.getSessionKey(guildId, userId);
    const sessionRaw = await this.redis.hGetAll(key);

    if (Object.keys(sessionRaw).length === 0) {
      return null; // Session doesn't exist
    }

    // tryUpdateSession now handles parsing and version checking
    const session = this.tryUpdateSession(sessionRaw);

    if (!session) {
      // If the session is invalid or an old version, delete it from Redis to prevent re-processing bad data.
      console.warn(`Deleting invalid/old session from Redis for key: ${key}`);
      await this.redis.del(key);
      return null;
    }

    // No need to hSet here as tryUpdateSession doesn't migrate anymore.
    // If a session is returned, it's valid and matches VERSION.
    return session;
  }

  // Method `updateVoiceSessionData` is commented out as per refactoring plan
  /*
  async updateVoiceSessionData(
    guildId: string,
    userId: string,
    updates: Partial<Omit<VoiceSession, "version">>,
  ): Promise<VoiceSession | null> {
    const session = await this.getVoiceSession(guildId, userId);
    if (!session) return null;

    const updatedSession = { ...session, ...updates };
    const key = this.getSessionKey(guildId, userId);
    console.log(`[Redis Update] Updating session data for ${key}`, updates);
    await this.redis.hSet(key, this.serializeVoiceSessionForRedis(updatedSession));

    return updatedSession;
  }
  */

  private serializeVoiceSessionForPrisma(
    userId: string,
    guildId: string,
    channelId: string,
    joinedAt: Date,
    leftAt: Date,
  ): Prisma.VoiceSessionUncheckedCreateInput {
    return {
      userId,
      guildId,
      channelId, // The initial channel ID when the session started
      joinedAt,
      leftAt,
    };
  }

  private serializeVoiceSessionForRedis(
    session: VoiceSession, // This is now ActiveVoiceSessionRedisSchema output type
  ): Record<string, string> {
    return {
      channelId: session.channelId,
      joinedAt: session.joinedAt.toISOString(),
      lastCombinationStartTime: session.lastCombinationStartTime.toISOString(),
      activeBitmask: String(session.activeBitmask),
      version: session.version, // Should be "3"
    };
  }

  // Method `updateSessionTimes` is commented out as per refactoring plan
  /*
  private updateSessionTimes(session: VoiceSession, delta: number): void {
    // This logic will be entirely different with the new schema
  }
  */

  async startVoiceSession(channelId: string, state: VoiceState): Promise<void> {
    const now = new Date();
    const guildId = state.guild.id;
    const userId = state.id;

    const sessionKey = this.getSessionKey(guildId, userId);
    const substatesKey = this.getCurrentVoiceSubstatesKey(guildId, userId);
    const bufferedActivitiesKey = this.getBufferedActivitiesKey(guildId, userId);

    const initialSubstates = new Set<string>();
    let activeBitmask = 0;

    if (state.mute) {
      initialSubstates.add("muted");
      activeBitmask |= CoreVoiceState.Muted;
    }
    if (state.deaf) {
      initialSubstates.add("deafened");
      activeBitmask |= CoreVoiceState.Deafened;
    }
    if (state.streaming) {
      initialSubstates.add("streaming");
      activeBitmask |= CoreVoiceState.Streaming;
    }
    if (state.selfVideo) {
      initialSubstates.add("video");
      activeBitmask |= CoreVoiceState.Video;
    }
    // TODO: Consider adding other initial substates like game activity if feasible.

    const newSessionData: VoiceSession = {
      channelId,
      joinedAt: now,
      lastCombinationStartTime: now,
      activeBitmask,
      version: VERSION, // "3"
    };

    const pipeline = this.redis.multi();
    pipeline.hSet(sessionKey, this.serializeVoiceSessionForRedis(newSessionData));
    pipeline.del(substatesKey);
    if (initialSubstates.size > 0) {
      pipeline.sAdd(substatesKey, [...initialSubstates]);
    }
    pipeline.del(bufferedActivitiesKey);

    await pipeline.exec();
  }

  async updateVoiceSessionState(newState: VoiceState, actionTime: Date): Promise<void> {
    const guildId = newState.guild.id;
    const userId = newState.id;

    const sessionKey = this.getSessionKey(guildId, userId);
    const currentSubstatesKey = this.getCurrentVoiceSubstatesKey(guildId, userId);
    const bufferedActivitiesKey = this.getBufferedActivitiesKey(guildId, userId);

    // Fetch Current Session Data (atomically)
    const pipelineResults = await this.redis
      .multi()
      .hGet(sessionKey, "lastCombinationStartTime")
      .smembers(currentSubstatesKey)
      .exec();

    if (!pipelineResults) {
      console.error(
        `[updateVoiceSessionState] Redis pipeline failed for user ${userId} in guild ${guildId}.`,
      );
      return;
    }

    const [lastCombinationStartTimeRaw, previousSubstatesArray, ..._rest] =
      pipelineResults as [string | null, string[], ...unknown[]];

    if (lastCombinationStartTimeRaw === null) {
      console.error(
        `[updateVoiceSessionState] lastCombinationStartTime not found in session ${sessionKey}. Aborting update. This might happen if a session ended abruptly or there's data inconsistency.`,
      );
      // Attempt to get the full session to see if it even exists or if it's just missing this one field
      const fullSession = await this.getVoiceSession(guildId, userId);
      if (!fullSession) {
        console.warn(
          `[updateVoiceSessionState] No active session found for ${userId} in ${guildId} via getVoiceSession. Perhaps it was already ended.`,
        );
      } else {
        console.warn(
          `[updateVoiceSessionState] Active session found, but lastCombinationStartTime was missing. Session data: ${JSON.stringify(fullSession)}`,
        );
      }
      return;
    }
    const lastCombinationStartTimeDate = new Date(lastCombinationStartTimeRaw);

    // Calculate Duration of Previous Combination
    let durationSeconds = differenceInSeconds(
      actionTime,
      lastCombinationStartTimeDate,
    );

    if (durationSeconds < 0) {
      console.warn(
        `[updateVoiceSessionState] Calculated negative duration (${durationSeconds}s) for ${sessionKey}. Clamping to 0. actionTime: ${actionTime.toISOString()}, lastCombinationStartTime: ${lastCombinationStartTimeDate.toISOString()}`,
      );
      durationSeconds = 0;
    }

    if (durationSeconds > 0) {
      // Even if previousSubstatesArray is empty, we record the duration as time spent in a "neutral" state.
      const previousSubstatesJsonString = JSON.stringify(
        previousSubstatesArray.sort(),
      );
      const activityEntry = {
        combination: previousSubstatesJsonString,
        duration: durationSeconds,
      };
      await this.redis.rPush(
        bufferedActivitiesKey,
        JSON.stringify(activityEntry),
      );
    }

    // Determine New State Combination
    const newSubstatesSet = new Set<string>();
    let newActiveBitmask = 0;

    if (newState.mute) {
      newSubstatesSet.add("muted");
      newActiveBitmask |= CoreVoiceState.Muted;
    }
    if (newState.deaf) {
      newSubstatesSet.add("deafened");
      newActiveBitmask |= CoreVoiceState.Deafened;
    }
    if (newState.streaming) {
      newSubstatesSet.add("streaming");
      newActiveBitmask |= CoreVoiceState.Streaming;
    }
    if (newState.selfVideo) {
      newSubstatesSet.add("video");
      newActiveBitmask |= CoreVoiceState.Video;
    }
    // TODO: Incorporate other arbitrary states like game activity

    // Update Redis with New State
    const updatePipeline = this.redis.multi();
    updatePipeline.hSet(sessionKey, {
      lastCombinationStartTime: actionTime.toISOString(),
      activeBitmask: String(newActiveBitmask),
      channelId: newState.channelId ?? "", // Ensure channelId is always set, even if nullish from newState
    });

    updatePipeline.del(currentSubstatesKey);
    if (newSubstatesSet.size > 0) {
      updatePipeline.sAdd(currentSubstatesKey, [...newSubstatesSet]);
    }

    await updatePipeline.exec();
  }

  // Method `updateVoiceSession` is commented out as per refactoring plan
  /*
  async updateVoiceSession(newState: VoiceState): Promise<void> {
    // This logic will be part of the new `updateVoiceSessionState`
  }
  */

  async endVoiceSession(guildId: string, userId: string, leftAt: Date): Promise<void> {
    const sessionKey = this.getSessionKey(guildId, userId);
    const bufferedActivitiesKey = this.getBufferedActivitiesKey(guildId, userId);
    const currentSubstatesKey = this.getCurrentVoiceSubstatesKey(guildId, userId);

    // Fetch Essential Session Data for Final Update
    const sessionDataFromRedis = await this.redis.hGetAll(sessionKey);

    if (
      !sessionDataFromRedis.joinedAt ||
      !sessionDataFromRedis.channelId // channelId is also crucial
    ) {
      console.warn(
        `[endVoiceSession] Session data (joinedAt or channelId) not found for ${sessionKey}. Session might have already ended or was not properly started.`,
      );
      // Clean up any potentially lingering Redis keys just in case
      const cleanupPipeline = this.redis.multi();
      cleanupPipeline.del(sessionKey);
      cleanupPipeline.del(currentSubstatesKey);
      cleanupPipeline.del(bufferedActivitiesKey);
      await cleanupPipeline.exec();
      return;
    }
    const joinedAtDate = new Date(sessionDataFromRedis.joinedAt);
    const retrievedChannelId = sessionDataFromRedis.channelId;

    // Finalize Last Activity Period
    // Construct a pseudo VoiceState for the final call to updateVoiceSessionState
    // This signifies the user leaving/state becoming "neutral"
    const pseudoState = {
      guild: { id: guildId },
      id: userId,
      mute: false, // Final state is effectively "not muted/deafened in a channel"
      deaf: false,
      streaming: false,
      selfVideo: false,
      channel: null, // User is leaving, so no channel
      channelId: null, // Explicitly null as they are leaving
      // other fields from VoiceState are not strictly necessary for updateVoiceSessionState if it's robust
    } as unknown as VoiceState;

    await this.updateVoiceSessionState(pseudoState, leftAt);

    try {
      await ensureUserExists(this.prisma, userId); // Assuming this is still relevant

      await this.prisma.$transaction(async (tx) => {
        // Create VoiceSession Record
        const voiceSessionRecord = this.serializeVoiceSessionForPrisma(
          userId,
          guildId,
          retrievedChannelId, // Use the channelId from when the session started
          joinedAtDate,
          leftAt,
        );
        const newSession = await tx.voiceSession.create({
          data: voiceSessionRecord,
        });

        // Retrieve and Process Buffered Activities
        const bufferedActivitiesRaw = await this.redis.lRange(
          bufferedActivitiesKey,
          0,
          -1,
        );

        if (bufferedActivitiesRaw.length > 0) {
          const activitiesToCreate = [];
          for (const activityRaw of bufferedActivitiesRaw) {
            try {
              const activity = JSON.parse(activityRaw) as {
                combination: string;
                duration: number;
              };
              if (activity.duration > 0) {
                activitiesToCreate.push({
                  voiceSessionId: newSession.id,
                  activeStates: JSON.parse(activity.combination), // Prisma expects a JsonValue (array in this case)
                  durationSeconds: activity.duration,
                });
              }
            } catch (parseError) {
              console.error(
                `[endVoiceSession] Failed to parse activity from Redis for session ${newSession.id}: ${activityRaw}`,
                parseError,
              );
              // Decide if this should halt the transaction or just skip the malformed entry
            }
          }
          if (activitiesToCreate.length > 0) {
            await tx.voiceSessionActivity.createMany({
              data: activitiesToCreate,
            });
          }
        }
      });

      // Clean Up Redis Data (after successful Prisma transaction)
      const cleanupPipeline = this.redis.multi();
      cleanupPipeline.del(sessionKey);
      cleanupPipeline.del(currentSubstatesKey);
      cleanupPipeline.del(bufferedActivitiesKey);
      await cleanupPipeline.exec();
    } catch (error) {
      console.error(
        `[endVoiceSession] Error during Prisma transaction or Redis cleanup for user ${userId} in guild ${guildId}:`,
        error,
      );
      // If Prisma transaction fails, Redis data is NOT deleted, allowing for potential recovery/retry.
    }
  }

  // Method `handleOrphanedSession` is commented out as per refactoring plan
  /*
  async handleOrphanedSession(key: string): Promise<void> {
    // This will need review after core logic is in place
  }
  */

  async handleNewGuild(guild: Guild): Promise<void> {
    const now = new Date();
    const activeVoiceStateUserIds = new Set<string>();
    console.log(
      `[handleNewGuild] Processing guild ${guild.id}. Found ${guild.voiceStates.cache.size} voice states.`,
    );

    // Process current voice states
    for (const voiceState of guild.voiceStates.cache.values()) {
      if (!voiceState.channel) { // Should not happen if user is in cache, but good check
        console.warn(`[handleNewGuild] User ${voiceState.id} in guild ${guild.id} is in voiceStates.cache but has no channel. Skipping.`);
        continue;
      }
      activeVoiceStateUserIds.add(voiceState.id);
      const session = await this.getVoiceSession(guild.id, voiceState.id);

      if (!session) {
        // No active Redis session, so start a new one
        console.log(
          `[handleNewGuild] No active session for ${voiceState.id} in ${guild.id}. Starting new session.`,
        );
        await this.startVoiceSession(voiceState.channel.id, voiceState);
        await this.updateVoiceSessionState(voiceState, now);
      } else {
        // Active Redis session exists.
        // This can happen if the bot restarted. We need to ensure the current state is accurately reflected.
        // updateVoiceSessionState will handle buffering the previous state and starting a new one.
        console.log(
          `[handleNewGuild] Active session found for ${voiceState.id} in ${guild.id}. Updating state to ensure consistency.`,
        );
        await this.updateVoiceSessionState(voiceState, now);
      }
    }
    console.log(
      `[handleNewGuild] Finished processing ${activeVoiceStateUserIds.size} active voice states in guild ${guild.id}.`,
    );

    // Orphaned Redis Session Handling
    const sessionPattern = this.getSessionKey(guild.id, "*"); // e.g., voiceSession:guildId:*
    const allRedisSessionKeys = await this.redis.keys(sessionPattern);
    console.log(
      `[handleNewGuild] Found ${allRedisSessionKeys.length} Redis session keys for guild ${guild.id}. Checking for orphans.`,
    );

    for (const key of allRedisSessionKeys) {
      const parts = key.split(":");
      if (parts.length < 3) { // Basic validation for "voiceSession:guildId:userId"
        console.warn(`[handleNewGuild] Invalid Redis key format encountered: ${key}. Skipping.`);
        continue;
      }
      const userIdFromKey = parts[2];

      if (!activeVoiceStateUserIds.has(userIdFromKey)) {
        // This user has a Redis session but is not currently in a voice channel in this guild.
        console.warn(
          `[handleNewGuild] Orphaned Redis session found for user ${userIdFromKey} in guild ${guild.id} (Key: ${key}). Ending it.`,
        );
        // Ensure ensureUserExists is handled if endVoiceSession relies on it for Prisma.
        // It's called within endVoiceSession.
        await this.endVoiceSession(guild.id, userIdFromKey, now);
      }
    }
    console.log(`[handleNewGuild] Finished orphan check for guild ${guild.id}.`);
  }

  async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    const now = new Date();
    const guildId = newState.guild?.id ?? oldState.guild?.id;
    const userId = newState.id;

    if (!guildId) {
      console.error(
        `[handleVoiceStateUpdate] Guild ID is undefined for user ${userId}. Old guild: ${oldState.guild?.id}, New guild: ${newState.guild?.id}. Aborting.`,
      );
      return;
    }

    // User Joins a Voice Channel
    if (!oldState.channel && newState.channel) {
      console.log(
        `[handleVoiceStateUpdate] User ${userId} JOINED channel ${newState.channel.id} in guild ${guildId}`,
      );
      await this.startVoiceSession(newState.channel.id, newState);
      await this.updateVoiceSessionState(newState, now); // Record initial state
    }
    // User Leaves a Voice Channel
    else if (oldState.channel && !newState.channel) {
      console.log(
        `[handleVoiceStateUpdate] User ${userId} LEFT channel ${oldState.channel.id} in guild ${guildId}`,
      );
      await this.endVoiceSession(guildId, userId, now);
    }
    // User Changes Voice State (moves channel, mutes, etc.)
    else if (oldState.channel && newState.channel) {
      if (oldState.channel.id !== newState.channel.id) {
        // Moved channel: End old session, start new one
        console.log(
          `[handleVoiceStateUpdate] User ${userId} MOVED from ${oldState.channel.id} to ${newState.channel.id} in guild ${guildId}`,
        );
        await this.endVoiceSession(guildId, userId, now);
        await this.startVoiceSession(newState.channel.id, newState);
        await this.updateVoiceSessionState(newState, now); // Record initial state in new channel
      } else {
        // Same channel, state update (mute, deafen, stream, video, etc.)
        console.log(
          `[handleVoiceStateUpdate] User ${userId} UPDATED state in channel ${newState.channel.id} in guild ${guildId}`,
        );
        await this.updateVoiceSessionState(newState, now);
      }
    }
    // Else (No specific condition met)
    else {
      console.log(
        `[handleVoiceStateUpdate] Unhandled voice state update for user ${userId} in guild ${guildId}. Old channel: ${oldState.channel?.id}, New channel: ${newState.channel?.id}`,
      );
    }
  }
}
