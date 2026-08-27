import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, RedisClient } from "@hashira/db";

import { base } from "../base";
import { VoiceSessionManager } from "./voiceSessionManager";

const createVoiceSessionManager = (redis: RedisClient, prisma: ExtendedPrismaClient) =>
  new VoiceSessionManager(redis, prisma);

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  .handle("guildAvailable", async ({ prisma, redis }, guild) => {
    const sessionManager = createVoiceSessionManager(redis, prisma);
    await sessionManager.handleNewGuild(guild);
  })
  .handle("guildCreate", async ({ prisma, redis }, guild) => {
    const sessionManager = createVoiceSessionManager(redis, prisma);
    await sessionManager.handleNewGuild(guild);
  })
  .handle("voiceStateUpdate", async ({ prisma, redis }, oldState, newState) => {
    const sessionManager = createVoiceSessionManager(redis, prisma);
    await sessionManager.handleVoiceStateUpdate(oldState, newState);
  });
