import { ConfirmationDialog, type ExtractContext, Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import env from "@hashira/env";
import { format, intervalToDuration, isAfter } from "date-fns";
import {
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type User,
  userMention,
} from "discord.js";
import OpenAI from "openai";
import { base } from "./base";
import { universalAddMute } from "./moderation/mutes";
import { AsyncFunction } from "./util/asyncFunction";
import { formatDuration } from "./util/duration";
import { isNotOwner } from "./util/isOwner";
import safeSendCode from "./util/safeSendCode";
import safeSendLongMessage from "./util/safeSendLongMessage";

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

type InterpreterContext = {
  prisma: ExtendedPrismaClient;
  guild: Guild;
  invokedBy: GuildMember;
  channel: GuildTextBasedChannel;
};

const createCodeInterpreter = (context: InterpreterContext) => {
  return async function interpretCode({ code }: { code: string }) {
    let result: unknown;
    await safeSendCode(context.channel.send.bind(context.channel), code, "js");
    const confirmation = new ConfirmationDialog(
      "Are you sure you want to run this code?",
      "Yes",
      "No",
      async () => {
        try {
          const fn = new AsyncFunction("prisma", "guild", "moderator", "channel", code);
          result = await fn(
            context.prisma,
            context.guild,
            context.invokedBy,
            context.channel,
          );
        } catch (error) {
          await context.invokedBy.send(`Error: ${error}`);
          throw error;
        }
      },
      async () => {
        result = "Code execution cancelled by user interaction or timeout.";
      },
      (interaction) => interaction.user.id === context.invokedBy.id,
    );

    await confirmation.render({ send: context.channel.send.bind(context.channel) });
    return result;
  };
};

const readInterpreterFunction = async (
  invoker: GuildMember,
  context: InterpreterContext,
) => {
  if (await isNotOwner(invoker)) return [];

  return [
    {
      type: "function",
      function: {
        function: createCodeInterpreter(context),
        description: `Write a code snippet to run in the context of the bot.
You can import using \`import { ... } from 'module'\`.
The code will be executed inside of a function with the following signature:
\`\`\`ts
async function (prisma: ExtendedPrismaClient, guild: Guild, moderator: GuildMember, channel: GuildTextBasedChannel): Promise<unknown> {
  // Your code here
}
\`\`\`
Do not write the function signature, just the code inside the function.`,
        parse: JSON.parse,
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description:
                "The code snippet to run. It should be a valid JavaScript code. It should always return a value.",
            },
          },
        },
      },
    },
  ] as const;
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

      const thread = await message.startThread({ name: "AI Command" });

      const prompt = [
        "You are a helpful moderation assistant for a Discord server. Formulate your responses in Polish. Your name is Biszkopt, a male assistant.",
        "You cannot interact with the moderator, only provide them with information and perform actions.",
        "If not given snowflake, respond that you need a user to be mentioned or their id.",
        `Current time: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
      ];

      const runner = ai.beta.chat.completions
        .runTools({
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
            ...(await readInterpreterFunction(message.member, {
              prisma,
              guild: message.guild,
              invokedBy: message.member,
              channel: message.channel,
            })),
          ],
        })
        .on("message", async (message) => {
          if (typeof message.content === "string" && message.role !== "tool") {
            const content = `${message.role === "system" ? "Biszkopt" : message.role}: ${message.content}`;
            await safeSendLongMessage(thread.send.bind(thread), content);
          }
        });

      await message.channel.sendTyping();
      const response = await runner.finalContent();
      await message.reply(response ?? "I'm sorry, I don't understand that.");
    },
  );
