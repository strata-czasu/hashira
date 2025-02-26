import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, Prisma, RedisClient } from "@hashira/db";
import { differenceInSeconds } from "date-fns";
import type { VoiceState } from "discord.js";
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

  await redis.hSet(
    `voiceSession:${guildId}:${userId}`,
    serializeVoiceSession(voiceSession),
  );
}

async function updateVoiceSession(
  redis: RedisClient,
  guildId: string,
  userId: string,
  newState: VoiceState,
) {
  const key = `voiceSession:${guildId}:${userId}`;
  const sessionRaw = await redis.hGetAll(key);

  // If no session exists, start a new one
  if (Object.keys(sessionRaw).length === 0 && newState.channel) {
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

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  // Add logic to handle all active voice sessions on ready
  .handle("ready", async ({ redis, prisma }, client) => {
    redis.on("connect", async () => {
      // Gather all active voice states from all guilds
      const activeVoiceStates = new Map();
      for (const guild of client.guilds.cache.values()) {
        for (const vs of guild.voiceStates.cache.values()) {
          if (vs.channel) {
            const key = `voiceSession:${guild.id}:${vs.id}`;
            activeVoiceStates.set(key, vs);
          }
        }
      }

      // Get all redis keys for active voice sessions
      const keys = await redis.keys("voiceSession:*");

      for (const key of keys) {
        if (activeVoiceStates.has(key)) {
          // Update session if active voice state exists
          const vs = activeVoiceStates.get(key);
          const parts = key.split(":"); // ["voiceSession", guildId, userId]
          const guildId = parts[1];
          const userId = parts[2];
          await updateVoiceSession(redis, guildId, userId, vs);
          activeVoiceStates.delete(key);
        } else {
          // End session if no active voice state is found
          const sessionRaw = await redis.hGetAll(key);
          const parseResult = v.safeParse(voiceSessionSchema, sessionRaw);
          if (!parseResult.success) {
            console.error(
              `Invalid session data for key ${key}`,
              v.flatten(parseResult.issues),
            );
            continue;
          }
          const session = parseResult.output;
          const parts = key.split(":");
          const guildId = parts[1];
          const userId = parts[2];
          await endVoiceSession(redis, prisma, guildId, userId, session.lastUpdate);
        }
      }

      // Start new sessions for remaining active voice states not found in redis
      for (const [key, vs] of activeVoiceStates) {
        const parts = key.split(":");
        const guildId = parts[1];
        const userId = parts[2];
        await startVoiceSession(redis, guildId, vs.channel.id, userId, vs);
      }
    });
  })
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
