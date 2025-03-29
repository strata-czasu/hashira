import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { differenceInSeconds } from "date-fns";
import type { Guild, VoiceState } from "discord.js";
import { pick } from "es-toolkit";
import * as v from "valibot";
import { ensureUserExists } from "../util/ensureUsersExist";

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

const voiceSessionSchemaV1 = v.object({
  channelId: v.string(),
  joinedAt: DateString,
  lastUpdate: DateString,
  isMuted: BooleanString,
  isDeafened: BooleanString,
  isStreaming: BooleanString,
  isVideo: BooleanString,
  totalDeafenedSeconds: NumberString,
  totalMutedSeconds: NumberString,
  totalStreamingSeconds: NumberString,
  totalVideoSeconds: NumberString,
  version: v.literal("1"),
});

const voiceSessionSchemaV2 = v.object({
  channelId: v.string(),
  joinedAt: DateString,
  lastUpdate: DateString,
  isMuted: BooleanString,
  isDeafened: BooleanString,
  isStreaming: BooleanString,
  isVideo: BooleanString,
  totalDeafenedSeconds: NumberString,
  totalMutedSeconds: NumberString,
  totalStreamingSeconds: NumberString,
  totalActiveStreamingSeconds: NumberString,
  totalVideoSeconds: NumberString,
  totalActiveVideoSeconds: NumberString,
  version: v.literal("2"),
});

const AnyVersionVoiceSessionSchema = v.union([
  voiceSessionSchemaV1,
  voiceSessionSchemaV2,
]);
type AnyVersionVoiceSessionSchema = v.InferOutput<typeof AnyVersionVoiceSessionSchema>;

const voiceSessionSchema = voiceSessionSchemaV2;
type VoiceSession = v.InferOutput<typeof voiceSessionSchema>;

const VERSION: VoiceSession["version"] = "2";

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

  private tryUpdateSession(session: AnyVersionVoiceSessionSchema): VoiceSession {
    let updatedSession = session;

    // Fix invalid data from version 1
    if (updatedSession.version === "1") {
      updatedSession = {
        ...updatedSession,
        totalActiveStreamingSeconds: 0,
        totalActiveVideoSeconds: 0,
        version: VERSION,
      };
    }

    return updatedSession;
  }

  async getVoiceSession(guildId: string, userId: string): Promise<VoiceSession | null> {
    const key = this.getSessionKey(guildId, userId);
    const sessionRaw = await this.redis.hGetAll(key);

    // If the session is empty, then it doesn't exist
    if (Object.keys(sessionRaw).length === 0) return null;

    const sessionResult = v.safeParse(AnyVersionVoiceSessionSchema, sessionRaw);

    if (!sessionResult.success) {
      const flatIssues = v.flatten(sessionResult.issues);
      throw new Error(`Invalid voice session data: ${JSON.stringify(flatIssues)}`);
    }

    const updatedSession = this.tryUpdateSession(sessionResult.output);

    if (sessionResult.output.version !== VERSION) {
      await this.redis.hSet(key, this.serializeVoiceSessionForRedis(updatedSession));
    }

    return updatedSession;
  }

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

  private serializeVoiceSessionForPrisma(
    session: VoiceSession,
    userId: string,
    guildId: string,
    leftAt: Date,
  ): Prisma.VoiceSessionUncheckedCreateInput {
    const cleanedSession = pick(session, [
      "channelId",
      "joinedAt",
      "totalDeafenedSeconds",
      "totalMutedSeconds",
      "totalStreamingSeconds",
      "totalActiveStreamingSeconds",
      "totalVideoSeconds",
      "totalActiveVideoSeconds",
    ]);

    return { ...cleanedSession, userId, guildId, leftAt };
  }

  private serializeVoiceSessionForRedis(
    session: VoiceSession,
  ): v.InferInput<typeof voiceSessionSchema> {
    return {
      channelId: session.channelId,
      joinedAt: session.joinedAt.toISOString(),
      lastUpdate: session.lastUpdate.toISOString(),
      isMuted: String(session.isMuted),
      isDeafened: String(session.isDeafened),
      isStreaming: String(session.isStreaming),
      isVideo: String(session.isVideo),
      totalMutedSeconds: String(session.totalMutedSeconds),
      totalDeafenedSeconds: String(session.totalDeafenedSeconds),
      totalStreamingSeconds: String(session.totalStreamingSeconds),
      totalActiveStreamingSeconds: String(session.totalActiveStreamingSeconds),
      totalVideoSeconds: String(session.totalVideoSeconds),
      totalActiveVideoSeconds: String(session.totalActiveVideoSeconds),
      version: session.version,
    };
  }

  private updateSessionTimes(session: VoiceSession, delta: number): void {
    if (session.isMuted) session.totalMutedSeconds += delta;
    if (session.isDeafened) session.totalDeafenedSeconds += delta;

    if (session.isStreaming) {
      if (!session.isMuted && !session.isDeafened) {
        session.totalActiveStreamingSeconds += delta;
      }

      session.totalStreamingSeconds += delta;
    }
    if (session.isVideo) {
      if (!session.isMuted && !session.isDeafened) {
        session.totalActiveVideoSeconds += delta;
      }

      session.totalVideoSeconds += delta;
    }
  }

  // Currently we only have one version, but this will be used for future migrations
  async startVoiceSession(channelId: string, state: VoiceState): Promise<void> {
    const now = new Date();
    const key = this.getSessionKey(state.guild.id, state.id);

    const voiceSession: VoiceSession = {
      version: "2",
      channelId,
      joinedAt: now,
      lastUpdate: now,
      isMuted: Boolean(state.mute),
      isDeafened: Boolean(state.deaf),
      isStreaming: Boolean(state.streaming),
      isVideo: Boolean(state.selfVideo),
      totalMutedSeconds: 0,
      totalDeafenedSeconds: 0,
      totalStreamingSeconds: 0,
      totalActiveStreamingSeconds: 0,
      totalVideoSeconds: 0,
      totalActiveVideoSeconds: 0,
    };

    await this.redis.hSet(key, this.serializeVoiceSessionForRedis(voiceSession));
  }

  async updateVoiceSession(newState: VoiceState): Promise<void> {
    const guildId = newState.guild.id;
    const userId = newState.id;
    const key = this.getSessionKey(guildId, userId);
    const session = await this.getVoiceSession(guildId, userId);

    if (!session) {
      if (!newState.channel) return;
      return await this.startVoiceSession(newState.channel.id, newState);
    }

    const now = new Date();
    const delta = differenceInSeconds(now, session.lastUpdate);

    this.updateSessionTimes(session, delta);

    session.isMuted = Boolean(newState.mute);
    session.isDeafened = Boolean(newState.deaf);
    session.isStreaming = Boolean(newState.streaming);
    session.isVideo = Boolean(newState.selfVideo);
    session.lastUpdate = now;

    await this.redis.hSet(key, this.serializeVoiceSessionForRedis(session));
  }

  async endVoiceSession(state: VoiceState, leftAt: Date): Promise<void> {
    const guildId = state.guild.id;
    const userId = state.id;
    const key = this.getSessionKey(guildId, userId);
    const session = await this.getVoiceSession(guildId, userId);

    if (!session) {
      throw new Error(`Session for ending not found: ${key}. This should not happen.`);
    }

    const delta = differenceInSeconds(leftAt, session.lastUpdate);

    this.updateSessionTimes(session, delta);

    const voiceSessionRecord = this.serializeVoiceSessionForPrisma(
      session,
      userId,
      guildId,
      leftAt,
    );

    await ensureUserExists(this.prisma, state.id);
    await this.prisma.voiceSession.create({ data: voiceSessionRecord });
    await this.redis.del(key);
  }

  async handleVoiceState(voiceState: VoiceState): Promise<[string] | []> {
    if (!voiceState.channel) return [];

    const key = this.getSessionKey(voiceState.guild.id, voiceState.id);
    const session = await this.getVoiceSession(voiceState.guild.id, voiceState.id);

    if (!session) {
      await this.startVoiceSession(voiceState.channel.id, voiceState);
      return [key];
    }

    if (session.channelId === voiceState.channel.id) {
      await this.updateVoiceSession(voiceState);
    } else {
      // We don't have a way to get the leftAt time, so we use the lastUpdate time
      await this.endVoiceSession(voiceState, session.lastUpdate);
      await this.startVoiceSession(voiceState.channel.id, voiceState);
    }

    return [key];
  }

  async handleOrphanedSession(key: string): Promise<void> {
    const [, guildId, userId] = key.split(":");

    try {
      if (!guildId || !userId) {
        throw new Error(`Invalid session key: ${key}`);
      }

      const session = await this.getVoiceSession(guildId, userId);

      if (!session) return;

      const voiceSession = this.serializeVoiceSessionForPrisma(
        session,
        userId,
        guildId,
        session.lastUpdate,
      );

      await ensureUserExists(this.prisma, userId);
      await this.prisma.voiceSession.create({ data: voiceSession });
      await this.redis.del(key);
    } catch (error) {
      console.error(`Failed to process orphaned session ${key}:`, error);
    }
  }

  async handleNewGuild(guild: Guild): Promise<void> {
    const allFoundSessions = await Promise.all(
      guild.voiceStates.cache.map((voiceState) => this.handleVoiceState(voiceState)),
    );

    const foundSessions = allFoundSessions.flat();

    const sessionPattern = `voiceSession:${guild.id}:*`;
    const allSessionKeys = await this.redis.keys(sessionPattern);
    const orphanedSessions = allSessionKeys.filter(
      (key) => !foundSessions.includes(key),
    );

    await Promise.all(orphanedSessions.map((key) => this.handleOrphanedSession(key)));
  }

  async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    // User joins a voice channel
    if (!oldState.channel && newState.channel) {
      return await this.startVoiceSession(newState.channel.id, newState);
    }

    // User leaves a voice channel
    if (oldState.channel && !newState.channel) {
      return await this.endVoiceSession(newState, new Date());
    }

    // User moves between channels or updates voice state within a channel
    if (oldState.channel && newState.channel) {
      if (oldState.channel.id !== newState.channel.id) {
        await this.endVoiceSession(newState, new Date());
        await this.startVoiceSession(newState.channel.id, newState);
        return;
      }

      // Same channel update
      return await this.updateVoiceSession(newState);
    }
  }
}
