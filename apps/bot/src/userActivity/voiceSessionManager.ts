import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { type RangeUnion, range } from "@hashira/utils/range";
import { type Duration, differenceInSeconds } from "date-fns";
import type { Guild, VoiceBasedChannel, VoiceState } from "discord.js";
import * as v from "valibot";
import { durationToSeconds } from "../util/duration";
import { ensureUserExists } from "../util/ensureUsersExist";
import {
  AnyVersionVoiceSessionSchema,
  VERSION,
  type VoiceSession,
  type voiceSessionSchema,
} from "./voiceSession/schema";

const stateRange = range(0, 32);
type RangeState = RangeUnion<0, 32>;

const MAX_SESSION_DURATION = { minutes: 15 } as const satisfies Duration;
const MAX_SESSION_DURATION_SECONDS = durationToSeconds(MAX_SESSION_DURATION);

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

    for (const i of stateRange) {
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

    for (const i of stateRange) {
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

  private voiceStateAlone(state: VoiceState): boolean {
    if (state.channel?.members.size !== 1) return false;

    return state.channel.members.has(state.id);
  }

  private encodeState(state: VoiceState): RangeState {
    let value = 0;
    if (state.mute) value |= 1;
    if (state.deaf) value |= 2;
    if (state.streaming) value |= 4;
    if (state.selfVideo) value |= 8;
    if (this.voiceStateAlone(state)) value |= 16;

    return value as RangeState;
  }

  private decodeState(value: RangeState): {
    isMuted: boolean;
    isDeafened: boolean;
    isStreaming: boolean;
    isVideo: boolean;
    isAlone: boolean;
  } {
    return {
      isMuted: (value & 1) !== 0,
      isDeafened: (value & 2) !== 0,
      isStreaming: (value & 4) !== 0,
      isVideo: (value & 8) !== 0,
      isAlone: (value & 16) !== 0,
    };
  }

  private async updateRemainingUsersAfterLeave(
    channel: VoiceBasedChannel,
  ): Promise<void> {
    if (channel.members.size === 1) {
      const remainingUser = channel.members.first();
      if (remainingUser?.voice) {
        const actualVoiceState = remainingUser.voice;

        if (actualVoiceState.channel?.id === channel.id) {
          await this.updateVoiceSession(actualVoiceState);
        }
      }
    }
  }

  private async updateUsersAfterJoin(
    channel: VoiceBasedChannel,
    excludeUserId?: string,
  ): Promise<void> {
    if (channel.members.size > 1) {
      for (const [, member] of channel.members) {
        if (
          member?.voice &&
          member.voice.channel?.id === channel.id &&
          member.id !== excludeUserId
        ) {
          await this.updateVoiceSession(member.voice);
        }
      }
    }
  }

  async startVoiceSession(
    channelId: string,
    state: VoiceState,
    now: Date,
  ): Promise<void> {
    const key = this.getSessionKey(state.guild.id, state.id);

    const voiceSession: VoiceSession = {
      version: VERSION,
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

    const now = new Date();

    if (!session) {
      if (!newState.channel) return;
      return await this.startVoiceSession(newState.channel.id, newState, now);
    }

    const delta = differenceInSeconds(now, session.lastUpdate);

    this.updateSessionTimes(session, delta);

    if (delta > MAX_SESSION_DURATION_SECONDS) {
      await this.endVoiceSession(newState, now);
      await this.startVoiceSession(session.channelId, newState, now);
      return;
    }

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
    const now = new Date();

    if (!session) {
      await this.startVoiceSession(voiceState.channel.id, voiceState, now);
      return [key];
    }

    if (session.channelId === voiceState.channel.id) {
      await this.updateVoiceSession(voiceState);
    } else {
      // We don't have a way to get the leftAt time, so we use the lastUpdate time
      await this.endVoiceSession(voiceState, session.lastUpdate);
      await this.startVoiceSession(voiceState.channel.id, voiceState, now);
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
      guild.voiceStates.cache.map((voiceState) => {
        return this.handleVoiceState(voiceState);
      }),
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
    const now = new Date();
    // User joins a voice channel
    if (!oldState.channel && newState.channel) {
      await this.startVoiceSession(newState.channel.id, newState, now);

      await this.updateUsersAfterJoin(newState.channel, newState.id);
      return;
    }

    // User leaves a voice channel
    if (oldState.channel && !newState.channel) {
      await this.updateRemainingUsersAfterLeave(oldState.channel);

      return await this.endVoiceSession(newState, now);
    }

    // User moves between channels or updates voice state within a channel
    if (oldState.channel && newState.channel) {
      if (oldState.channel.id !== newState.channel.id) {
        await this.updateRemainingUsersAfterLeave(oldState.channel);

        await this.endVoiceSession(newState, now);
        await this.startVoiceSession(newState.channel.id, newState, now);

        await this.updateUsersAfterJoin(newState.channel, newState.id);

        return;
      }

      // Same channel, just updating state
      return await this.updateVoiceSession(newState);
    }
  }
}
