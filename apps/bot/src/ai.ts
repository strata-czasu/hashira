import { type ExtractContext, Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import env from "@hashira/env";
import { format, intervalToDuration, isAfter } from "date-fns";
import { type Guild, type User, userMention } from "discord.js";
import OpenAI from "openai";
import { base } from "./base";
import { universalAddMute } from "./moderation/mutes";
import { formatDuration } from "./util/duration";

const createMute = (
  prisma: ExtendedPrismaClient,
  messageQueue: ExtractContext<typeof base>["messageQueue"],
  log: ExtractContext<typeof base>["moderationLog"],
  guild: Guild,
  moderator: User,
  reply: (content: string) => Promise<unknown>,
  replyToModerator: (content: string) => Promise<unknown>,
) => {
  async function mute({
    userId,
    duration,
    reason,
  }: { userId: string; duration: string; reason: string }) {
    await universalAddMute({
      prisma,
      messageQueue,
      log,
      userId,
      guild,
      moderator,
      duration,
      reason,
      reply,
      replyToModerator,
    });
  }

  return mute;
};

const createGetLatestMutes = (prisma: ExtendedPrismaClient, guildId: string) => {
  return async function getLatestMutes({ userId }: { userId: string }) {
    const mutes = await prisma.mute.findMany({
      where: { guildId, userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const now = new Date();

    return mutes.map((mute) => ({
      id: mute.id,
      mutedBy: mute.moderatorId,
      reason: mute.reason,
      duration: formatDuration(
        intervalToDuration({ start: mute.createdAt, end: mute.endsAt }),
      ),
      ...(isAfter(now, mute.endsAt)
        ? {
            timeSinceEnd: formatDuration(
              intervalToDuration({ start: mute.endsAt, end: now }),
            ),
          }
        : {}),
    }));
  };
};

const createGetLatestWarns = (prisma: ExtendedPrismaClient, guildId: string) => {
  return async function getLatestWarns({ userId }: { userId: string }) {
    const warns = await prisma.warn.findMany({
      where: { guildId, userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return warns.map((warn) => ({
      id: warn.id,
      warnedBy: warn.moderatorId,
      reason: warn.reason,
      timeSince: formatDuration(
        intervalToDuration({ start: warn.createdAt, end: new Date() }),
      ),
    }));
  };
};

const snowflake = {
  type: "string",
  pattern: "^\\d+$",
  description: "A Discord snowflake. Can be parsed from mention like <@id>, <#id>.",
} as const;

export const ai = new Hashira({ name: "ai" })
  .use(base)
  .const("ai", env.OPENAI_KEY ? new OpenAI({ apiKey: env.OPENAI_KEY }) : null)
  .handle(
    "messageCreate",
    async ({ ai, prisma, messageQueue, moderationLog }, message) => {
      if (!ai) return;
      if (message.author.bot) return;
      if (!message.inGuild()) return;
      if (!message.member) return;
      if (!message.member.permissions.has("ModerateMembers")) return;
      const botMention = userMention(message.client.user.id);
      if (!message.content.startsWith(botMention)) return;
      const content = message.content.slice(botMention.length).trim();
      if (!content) return;

      const prompt = [
        "You are a helpful moderation assistant for a Discord server. Formulate your responses in Polish. Your name is Biszkopt, a male assistant.",
        "You cannot interact with the moderator, only provide them with information and perform actions.",
        "If not given snowflake, respond that you need a user to be mentioned or their id.",
        `Current time: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
      ];

      const runner = ai.beta.chat.completions.runTools({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: prompt.join("\n"),
          },
          {
            role: "user",
            content,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              function: createMute(
                prisma,
                messageQueue,
                moderationLog,
                message.guild,
                message.author,
                (content) => message.reply(content),
                (content) => message.author.send(content),
              ),
              parse: JSON.parse,
              description: "Mute a user.",
              parameters: {
                type: "object",
                properties: {
                  userId: snowflake,
                  duration: { type: "string", pattern: "^(\\d+)([hmsd])$" },
                  reason: { type: "string" },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              function: createGetLatestMutes(prisma, message.guild.id),
              description: "Get the latest 5 mutes for the user.",
              parse: JSON.parse,
              parameters: {
                type: "object",
                properties: {
                  userId: snowflake,
                },
              },
            },
          },
          {
            type: "function",
            function: {
              function: createGetLatestWarns(prisma, message.guild.id),
              description: "Get the latest warns for the user.",
              parse: JSON.parse,
              parameters: {
                type: "object",
                properties: {
                  userId: snowflake,
                },
              },
            },
          },
        ],
      });

      await message.channel.sendTyping();
      const response = await runner.finalContent();
      await message.reply(response ?? "I'm sorry, I don't understand that.");
    },
  );
