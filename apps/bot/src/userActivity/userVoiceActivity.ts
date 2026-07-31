import { Hashira } from "@hashira/core";
import { base } from "../base";
import { awardBirthday2026VoicePasza } from "../events/birthday2026/voiceEarningService";
import { VoiceSessionManager } from "./voiceSessionManager";

const createVoiceSessionManager = (
  redis: ConstructorParameters<typeof VoiceSessionManager>[0],
  prisma: ConstructorParameters<typeof VoiceSessionManager>[1],
) =>
  new VoiceSessionManager(redis, prisma, async (voiceSessionId) => {
    await awardBirthday2026VoicePasza(prisma, { voiceSessionId });
  });

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
