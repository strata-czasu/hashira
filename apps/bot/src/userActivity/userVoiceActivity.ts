import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, PrismaTransaction, RedisClient } from "@hashira/db";
import { base } from "../base";
import { VoiceSessionManager } from "./voiceSessionManager";

const createVoiceSessionManager = (
  redis: RedisClient,
  prisma: ExtendedPrismaClient,
  enqueueVoiceAward: (voiceSessionId: number, tx: PrismaTransaction) => Promise<void>,
) => new VoiceSessionManager(redis, prisma, enqueueVoiceAward);

const enqueueBirthday2026VoiceAward = (
  messageQueue: {
    push: (
      type: "birthday2026VoiceAward",
      data: { voiceSessionId: number },
      delay?: number | Date,
      identifier?: string,
      tx?: PrismaTransaction,
    ) => Promise<void>;
  },
  voiceSessionId: number,
  tx: PrismaTransaction,
) =>
  messageQueue.push(
    "birthday2026VoiceAward",
    { voiceSessionId },
    undefined,
    `birthday2026VoiceAward:${voiceSessionId}`,
    tx,
  );

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  .handle("guildAvailable", async ({ messageQueue, prisma, redis }, guild) => {
    const sessionManager = createVoiceSessionManager(
      redis,
      prisma,
      (voiceSessionId, tx) =>
        enqueueBirthday2026VoiceAward(messageQueue, voiceSessionId, tx),
    );
    await sessionManager.handleNewGuild(guild);
  })
  .handle("guildCreate", async ({ messageQueue, prisma, redis }, guild) => {
    const sessionManager = createVoiceSessionManager(
      redis,
      prisma,
      (voiceSessionId, tx) =>
        enqueueBirthday2026VoiceAward(messageQueue, voiceSessionId, tx),
    );
    await sessionManager.handleNewGuild(guild);
  })
  .handle(
    "voiceStateUpdate",
    async ({ messageQueue, prisma, redis }, oldState, newState) => {
      const sessionManager = createVoiceSessionManager(
        redis,
        prisma,
        (voiceSessionId, tx) =>
          enqueueBirthday2026VoiceAward(messageQueue, voiceSessionId, tx),
      );
      await sessionManager.handleVoiceStateUpdate(oldState, newState);
    },
  );
