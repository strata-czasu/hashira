import { type ExtractContext, Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import env from "@hashira/env";
import { type Guild, userMention } from "discord.js";
import OpenAI from "openai";
import { base } from "./base";
import { universalAddMute } from "./moderation/mutes";

const createMute = (
  prisma: ExtendedPrismaClient,
  messageQueue: ExtractContext<typeof base>["messageQueue"],
  guild: Guild,
  moderatorId: string,
  reply: (content: string) => Promise<unknown>,
) => {
  async function mute({
    userId,
    duration,
    reason,
  }: { userId: string; duration: string; reason: string }) {
    await universalAddMute({
      prisma,
      messageQueue,
      userId,
      guild,
      moderatorId,
      duration,
      reason,
      reply,
    });
  }

  return mute;
};

export const ai = new Hashira({ name: "ai" })
  .use(base)
  .const("ai", env.OPENAI_KEY ? new OpenAI({ apiKey: env.OPENAI_KEY }) : null)
  .handle("messageCreate", async ({ ai, prisma, messageQueue }, message) => {
    if (!ai) return;
    if (message.author.bot) return;
    if (!message.inGuild()) return;
    if (!message.member) return;
    if (!message.member.permissions.has("ModerateMembers")) return;
    const botMention = userMention(message.client.user.id);
    if (!message.content.startsWith(botMention)) return;
    const content = message.content.slice(botMention.length).trim();
    if (!content) return;

    const runner = ai.beta.chat.completions.runTools({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: "You are a helpful moderation assistant for a Discord server. Formulate your responses in Polish.",
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
              message.guild,
              message.author.id,
              (content) => message.reply(content),
            ),
            parse: JSON.parse,
            description: "Mute a user.",
            parameters: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  pattern: "^\\d+$",
                  description:
                    "The user id to mute. Can be parsed from mention like <@id>.",
                },
                duration: { type: "string", pattern: "^(\\d+)([hmsd])$" },
                reason: { type: "string" },
              },
            },
          },
        },
      ],
    });

    await message.channel.sendTyping();
    const response = await runner.finalContent();
    await message.reply(response ?? "I'm sorry, I don't understand that.");
  });
