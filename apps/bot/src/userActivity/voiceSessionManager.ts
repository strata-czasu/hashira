import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { type RangeUnion, range } from "@hashira/utils/range";
import { differenceInSeconds } from "date-fns";
import type { Guild, VoiceState } from "discord.js";
import * as v from "valibot";
import { ensureUserExists } from "../util/ensureUsersExist";
import {
  AnyVersionVoiceSessionSchema,
  VERSION,
  type VoiceSession,
  type voiceSessionSchema,
} from "./voiceSession/schema";

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
        version: "2",
      };
    }

    // Migrate from version 2 to version 3, remove old data because it's not easily mappable
    if (updatedSession.version === "2") {
      updatedSession = {
        channelId: updatedSession.channelId,
        joinedAt: updatedSession.joinedAt,
        lastUpdate: updatedSession.lastUpdate,
        state: 0,
        version: "3",
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
  ): Prisma.VoiceSessionCreateInput {
    const totals: Prisma.VoiceSessionTotalCreateManyVoiceSessionInput[] = [];

    for (const i of range(0, 16)) {
      const key = `total_${i}` as const;
      const value = session[key];

      if (value && value > 0) {
        totals.push({ ...this.decodeState(i), secondsSpent: value });
      }
    }

    return {
      channelId: session.channelId,
      joinedAt: session.joinedAt,
      leftAt,
      user: { connectOrCreate: { where: { id: userId }, create: { id: userId } } },
      guild: { connectOrCreate: { where: { id: guildId }, create: { id: guildId } } },
      totals: {
        createMany: { data: totals },
      },
    };
  }

  private serializeVoiceSessionForRedis(
    session: VoiceSession,
  ): v.InferInput<typeof voiceSessionSchema> {
    // Only include total_{i} fields that have non-zero values or are the current state
    const result: v.InferInput<typeof voiceSessionSchema> = {
      channelId: session.channelId,
      joinedAt: session.joinedAt.toISOString(),
      lastUpdate: session.lastUpdate.toISOString(),
      state: `${session.state}`,
      version: session.version,
    };

    for (const i of range(0, 16)) {
      const key = `total_${i}` as const;

      const value = session[key] ?? 0;

      if (value > 0) {
        result[key] = String(value);
      }
    }

    return result;
  }

  private updateSessionTimes(session: VoiceSession, delta: number): void {
    session[`total_${session.state}`] =
      (session[`total_${session.state}`] ?? 0) + delta;
  }

  private encodeState(state: VoiceState): RangeUnion<0, 16> {
    let value = 0;
    if (state.mute) value |= 1;
    if (state.deaf) value |= 2;
    if (state.streaming) value |= 4;
    if (state.selfVideo) value |= 8;

    return value as RangeUnion<0, 16>;
  }

  private decodeState(value: RangeUnion<0, 16>): {
    isMuted: boolean;
    isDeafened: boolean;
    isStreaming: boolean;
    isVideo: boolean;
  } {
    return {
      isMuted: (value & 1) !== 0,
      isDeafened: (value & 2) !== 0,
      isStreaming: (value & 4) !== 0,
      isVideo: (value & 8) !== 0,
    };
  }

  // Currently we only have one version, but this will be used for future migrations
  async startVoiceSession(channelId: string, state: VoiceState): Promise<void> {
    const now = new Date();
    const key = this.getSessionKey(state.guild.id, state.id);

    const voiceSession: VoiceSession = {
      version: "3",
      channelId,
      joinedAt: now,
      lastUpdate: now,
      state: this.encodeState(state),
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
    session.state = this.encodeState(newState);
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
