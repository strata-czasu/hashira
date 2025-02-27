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
  totalDeafenedTime: NumberString,
  totalMutedTime: NumberString,
  totalStreamingTime: NumberString,
  totalVideoTime: NumberString,
});

type VoiceSession = v.InferOutput<typeof voiceSessionSchema>;

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
    totalMutedTime: session.totalMutedTime,
    totalDeafenedTime: session.totalDeafenedTime,
    totalStreamingTime: session.totalStreamingTime,
    totalVideoTime: session.totalVideoTime,
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
  totalMutedTime: String(session.totalMutedTime),
  totalDeafenedTime: String(session.totalDeafenedTime),
  totalStreamingTime: String(session.totalStreamingTime),
  totalVideoTime: String(session.totalVideoTime),
});

async function startVoiceSession(
  redis: RedisClient,
  guildId: string,
  channelId: string,
  userId: string,
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
    totalMutedTime: 0,
    totalDeafenedTime: 0,
    totalStreamingTime: 0,
    totalVideoTime: 0,
  };

  await redis.hSet(getSessionKey(guildId, userId), serializeVoiceSession(voiceSession));
}

async function updateVoiceSession(
  redis: RedisClient,
  guildId: string,
  userId: string,
  newState: VoiceState,
) {
  const key = getSessionKey(guildId, userId);
  const sessionRaw = await redis.hGetAll(key);

  // If no session exists, start a new one
  if (!sessionExists(sessionRaw) && newState.channel) {
    await startVoiceSession(redis, guildId, newState.channel.id, userId, newState);
    return;
  }

  const sessionResult = v.safeParse(voiceSessionSchema, sessionRaw);
  if (!sessionResult.success) {
    const flatIssues = v.flatten(sessionResult.issues);
    throw new Error(`Invalid voice session data: ${JSON.stringify(flatIssues)}`);
  }

  const session = sessionResult.output;
  const now = new Date();
  const delta = differenceInSeconds(now, session.lastUpdate);

  if (session.isMuted) {
    session.totalMutedTime += delta;
  }
  if (session.isDeafened) {
    session.totalDeafenedTime += delta;
  }
  if (session.isStreaming) {
    session.totalStreamingTime += delta;
  }
  if (session.isVideo) {
    session.totalVideoTime += delta;
  }

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
  guildId: string,
  userId: string,
  leftAt: Date,
) {
  const key = `voiceSession:${guildId}:${userId}`;
  const sessionRaw = await redis.hGetAll(key);
  const sessionResult = v.safeParse(voiceSessionSchema, sessionRaw);
  if (!sessionResult.success) {
    const flatIssues = v.flatten(sessionResult.issues);
    throw new Error(`Invalid voice session data: ${JSON.stringify(flatIssues)}`);
  }

  console.log(`Ending voice session for ${userId} in ${guildId}`);

  const session = sessionResult.output;
  const delta = differenceInSeconds(leftAt, session.lastUpdate);
  if (session.isMuted) {
    session.totalMutedTime += delta;
  }
  if (session.isDeafened) {
    session.totalDeafenedTime += delta;
  }
  if (session.isStreaming) {
    session.totalStreamingTime += delta;
  }
  if (session.isVideo) {
    session.totalVideoTime += delta;
  }

  const voiceSessionRecord = serializeVoiceSessionRecord(
    session,
    userId,
    guildId,
    leftAt,
  );
  await prisma.voiceSessionRecord.create({ data: voiceSessionRecord });
  await redis.del(key);
}

const getSessionKey = (guildId: string, userId: string) =>
  `voiceSession:${guildId}:${userId}`;

const sessionExists = (rawSession: Record<string, string>) =>
  Object.keys(rawSession).length > 0;

async function handleNewGuild(
  { redis, prisma }: { redis: RedisClient; prisma: ExtendedPrismaClient },
  guild: Guild,
) {
  console.log("sus");
  const foundSessions: string[] = [];
  for (const vs of guild.voiceStates.cache.values()) {
    if (!vs.channel) continue;
    // check if the user was registered in redis
    const key = getSessionKey(guild.id, vs.id);
    const sessionRaw = await redis.hGetAll(key);

    if (!sessionExists(sessionRaw)) {
      await startVoiceSession(redis, guild.id, vs.channel.id, vs.id, vs);
      foundSessions.push(key);
      continue;
    }

    const sessionResult = v.safeParse(voiceSessionSchema, sessionRaw);
    if (!sessionResult.success) {
      const flatIssues = v.flatten(sessionResult.issues);
      throw new Error(`Invalid voice session data: ${JSON.stringify(flatIssues)}`);
    }

    const session = sessionResult.output;

    if (session.channelId === vs.channel.id) {
      await updateVoiceSession(redis, guild.id, vs.id, vs);
      foundSessions.push(key);
    } else {
      // NOTE: We don't have a way to get the leftAt time, so we use the lastUpdate time
      await endVoiceSession(redis, prisma, guild.id, vs.id, session.lastUpdate);
      await startVoiceSession(redis, guild.id, vs.channel.id, vs.id, vs);
      foundSessions.push(key);
    }
  }

  // Delete all sessions that were not found
  const sessionPattern = `voiceSession:${guild.id}:*`;
  const allSessionKeys = await redis.keys(sessionPattern);
  console.log(
    `Found ${foundSessions.length} active voice sessions for guild ${guild.id}`,
  );
  console.log(`Found ${allSessionKeys.length} voice sessions for guild ${guild.id}`);

  // Filter out the keys that weren't found in the active voice states
  const orphanedSessions = allSessionKeys.filter((key) => !foundSessions.includes(key));

  // End each orphaned session and persist to database before deleting
  for (const key of orphanedSessions) {
    console.log(`Found orphaned voice session for ${key}`);
    const [, , userId] = key.split(":");
    try {
      const sessionRaw = await redis.hGetAll(key);
      if (sessionExists(sessionRaw) && userId) {
        const sessionResult = v.safeParse(voiceSessionSchema, sessionRaw);
        if (sessionResult.success) {
          const session = sessionResult.output;
          console.log(`Ending orphaned voice session for ${userId} in ${guild.id}`);
          const voiceSessionRecord = serializeVoiceSessionRecord(
            session,
            userId,
            guild.id,
            session.lastUpdate,
          );
          await prisma.voiceSessionRecord.create({ data: voiceSessionRecord });
        }
      }
      // Delete the session regardless of whether we could parse it
      await redis.del(key);
    } catch (error) {
      console.error(`Failed to process orphaned session ${key}:`, error);
      // Continue with other sessions even if one fails
    }
  }

  if (orphanedSessions.length > 0) {
    console.log(
      `Cleaned up ${orphanedSessions.length} orphaned voice sessions in guild ${guild.id}`,
    );
  }
}

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  .handle("guildAvailable", handleNewGuild)
  .handle("guildCreate", handleNewGuild)
  .handle("voiceStateUpdate", async ({ prisma, redis }, oldState, newState) => {
    const guildId = newState.guild.id;
    const userId = newState.id;

    if (!oldState.channel && newState.channel) {
      await startVoiceSession(redis, guildId, newState.channel.id, userId, newState);
      return;
    }

    // User moves between channels or updates voice state within a channel
    if (oldState.channel && newState.channel) {
      if (oldState.channel.id !== newState.channel.id) {
        await endVoiceSession(redis, prisma, guildId, userId, new Date());
        await startVoiceSession(redis, guildId, newState.channel.id, userId, newState);
        return;
      }

      // Same channel update
      await updateVoiceSession(redis, guildId, userId, newState);
      return;
    }

    // User leaves a voice channel
    if (oldState.channel && !newState.channel) {
      await endVoiceSession(redis, prisma, guildId, userId, new Date());
      return;
    }
  });
