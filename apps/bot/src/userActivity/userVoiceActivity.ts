import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { differenceInSeconds } from "date-fns";
import type { Guild, VoiceState } from "discord.js";
import * as v from "valibot";
import { base } from "../base";

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

const voiceSessionSchema = v.object({
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
});

type VoiceSession = v.InferOutput<typeof voiceSessionSchema>;

const getSessionKey = (guildId: string, userId: string) =>
  `voiceSession:${guildId}:${userId}`;

const sessionExists = (rawSession: Record<string, string>) =>
  Object.keys(rawSession).length > 0;

function parseVoiceSession(sessionRaw: Record<string, string>): VoiceSession {
  const sessionResult = v.safeParse(voiceSessionSchema, sessionRaw);

  if (!sessionResult.success) {
    const flatIssues = v.flatten(sessionResult.issues);
    throw new Error(`Invalid voice session data: ${JSON.stringify(flatIssues)}`);
  }

  return sessionResult.output;
}

function parseVoiceSessionOrNull(
  sessionRaw: Record<string, string>,
): VoiceSession | null {
  if (!sessionExists(sessionRaw)) return null;

  return parseVoiceSession(sessionRaw);
}

function serializeVoiceSessionRecord(
  session: VoiceSession,
  userId: string,
  guildId: string,
  leftAt: Date,
): Prisma.VoiceSessionRecordUncheckedCreateInput {
  return {
    channelId: session.channelId,
    userId,
    guildId,
    joinedAt: session.joinedAt,
    leftAt: leftAt,
    totalMutedSeconds: session.totalMutedSeconds,
    totalDeafenedSeconds: session.totalDeafenedSeconds,
    totalStreamingSeconds: session.totalStreamingSeconds,
    totalVideoSeconds: session.totalVideoSeconds,
  };
}

const serializeVoiceSession = (session: VoiceSession) => ({
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
  totalVideoSeconds: String(session.totalVideoSeconds),
});

function updateSessionTimes(session: VoiceSession, delta: number) {
  if (session.isMuted) session.totalMutedSeconds += delta;
  if (session.isDeafened) session.totalDeafenedSeconds += delta;
  if (session.isStreaming) session.totalStreamingSeconds += delta;
  if (session.isVideo) session.totalVideoSeconds += delta;
}

async function startVoiceSession(
  redis: RedisClient,
  channelId: string,
  state: VoiceState,
) {
  const now = new Date();

  const voiceSession: VoiceSession = {
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
    totalVideoSeconds: 0,
  };

  await redis.hSet(
    getSessionKey(state.guild.id, state.id),
    serializeVoiceSession(voiceSession),
  );
}

async function updateVoiceSession(redis: RedisClient, newState: VoiceState) {
  const guildId = newState.guild.id;
  const userId = newState.id;
  const key = getSessionKey(guildId, userId);
  const sessionRaw = await redis.hGetAll(key);

  if (!sessionExists(sessionRaw) && newState.channel) {
    await startVoiceSession(redis, newState.channel.id, newState);
    return;
  }

  const session = parseVoiceSession(sessionRaw);
  const now = new Date();
  const delta = differenceInSeconds(now, session.lastUpdate);

  updateSessionTimes(session, delta);

  session.isMuted = Boolean(newState.mute);
  session.isDeafened = Boolean(newState.deaf);
  session.isStreaming = Boolean(newState.streaming);
  session.isVideo = Boolean(newState.selfVideo);
  session.lastUpdate = now;

  await redis.hSet(key, serializeVoiceSession(session));
}

async function endVoiceSession(
  redis: RedisClient,
  prisma: ExtendedPrismaClient,
  state: VoiceState,
  leftAt: Date,
) {
  const guildId = state.guild.id;
  const userId = state.id;
  const key = `voiceSession:${guildId}:${userId}`;
  const sessionRaw = await redis.hGetAll(key);
  const session = parseVoiceSession(sessionRaw);
  const delta = differenceInSeconds(leftAt, session.lastUpdate);

  updateSessionTimes(session, delta);

  const voiceSessionRecord = serializeVoiceSessionRecord(
    session,
    userId,
    guildId,
    leftAt,
  );

  await prisma.voiceSessionRecord.create({ data: voiceSessionRecord });
  await redis.del(key);
}

async function handleVoiceState(
  redis: RedisClient,
  prisma: ExtendedPrismaClient,
  voiceState: VoiceState,
): Promise<[string] | []> {
  if (!voiceState.channel) return [];

  const key = getSessionKey(voiceState.guild.id, voiceState.id);
  const sessionRaw = await redis.hGetAll(key);

  const session = parseVoiceSessionOrNull(sessionRaw);

  if (!session) {
    await startVoiceSession(redis, voiceState.channel.id, voiceState);
    return [key];
  }

  if (session.channelId === voiceState.channel.id) {
    await updateVoiceSession(redis, voiceState);
  } else {
    // We don't have a way to get the leftAt time, so we use the lastUpdate time
    await endVoiceSession(redis, prisma, voiceState, session.lastUpdate);
    await startVoiceSession(redis, voiceState.channel.id, voiceState);
  }

  return [key];
}

async function handleOrphanedSession(
  redis: RedisClient,
  prisma: ExtendedPrismaClient,
  key: string,
) {
  const [, guildId, userId] = key.split(":");

  try {
    if (!guildId || !userId) {
      throw new Error(`Invalid session key: ${key}`);
    }

    const sessionRaw = await redis.hGetAll(key);
    const session = parseVoiceSessionOrNull(sessionRaw);

    if (!session) return;

    const voiceSessionRecord = serializeVoiceSessionRecord(
      session,
      userId,
      guildId,
      session.lastUpdate,
    );

    await prisma.voiceSessionRecord.create({ data: voiceSessionRecord });
    await redis.del(key);
  } catch (error) {
    console.error(`Failed to process orphaned session ${key}:`, error);
  }
}

async function handleNewGuild(
  { redis, prisma }: { redis: RedisClient; prisma: ExtendedPrismaClient },
  guild: Guild,
) {
  const allFoundSessions = await Promise.all(
    guild.voiceStates.cache.map((voiceState) =>
      handleVoiceState(redis, prisma, voiceState),
    ),
  );

  const foundSessions = allFoundSessions.flat();

  const sessionPattern = `voiceSession:${guild.id}:*`;
  const allSessionKeys = await redis.keys(sessionPattern);
  const orphanedSessions = allSessionKeys.filter((key) => !foundSessions.includes(key));

  await Promise.all(
    orphanedSessions.map((key) => handleOrphanedSession(redis, prisma, key)),
  );
}

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  .handle("guildAvailable", handleNewGuild)
  .handle("guildCreate", handleNewGuild)
  .handle("voiceStateUpdate", async ({ prisma, redis }, oldState, newState) => {
    // User joins a voice channel
    if (!oldState.channel && newState.channel) {
      return await startVoiceSession(redis, newState.channel.id, newState);
    }

    // User leaves a voice channel
    if (oldState.channel && !newState.channel) {
      return await endVoiceSession(redis, prisma, newState, new Date());
    }

    // User moves between channels or updates voice state within a channel
    if (oldState.channel && newState.channel) {
      if (oldState.channel.id !== newState.channel.id) {
        await endVoiceSession(redis, prisma, newState, new Date());
        await startVoiceSession(redis, newState.channel.id, newState);
        return;
      }

      // Same channel update
      return await updateVoiceSession(redis, newState);
    }
  });
