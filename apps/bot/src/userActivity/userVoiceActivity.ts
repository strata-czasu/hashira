import { Hashira } from "@hashira/core";
import { base } from "../base";
import { VoiceSessionManager } from "./voiceSessionManager";

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  .handle("guildAvailable", async ({ prisma, redis }, guild) => {
    const sessionManager = new VoiceSessionManager(redis, prisma);
    await sessionManager.handleNewGuild(guild);
  })
  .handle("guildCreate", async ({ prisma, redis }, guild) => {
    const sessionManager = new VoiceSessionManager(redis, prisma);
    await sessionManager.handleNewGuild(guild);
  })
  .handle("voiceStateUpdate", async ({ prisma, redis }, oldState, newState) => {
    const sessionManager = new VoiceSessionManager(redis, prisma);
    await sessionManager.handleVoiceStateUpdate(oldState, newState);
  });
