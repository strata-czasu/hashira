import { ConfirmationDialog, type ExtractContext } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import { intervalToDuration, isAfter } from "date-fns";
import {
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  RESTJSONErrorCodes,
  type User,
} from "discord.js";
import type { base } from "../base";
import { universalAddMute } from "../moderation/mutes";
import { AsyncFunction } from "../util/asyncFunction";
import { discordTry } from "../util/discordTry";
import { formatDuration } from "../util/duration";
import { isNotOwner } from "../util/isOwner";
import safeSendCode from "../util/safeSendCode";

export const createMute = (
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
  }: {
    userId: string;
    duration: string;
    reason: string;
  }) {
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

export const createGetLatestMutes = (prisma: ExtendedPrismaClient, guildId: string) => {
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

export const createGetLatestWarns = (prisma: ExtendedPrismaClient, guildId: string) => {
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

export const createFetchMessage = (guild: Guild) => {
  return async function fetchMessage({
    channelId,
    messageId,
  }: {
    channelId: string;
    messageId: string;
  }) {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return "Channel not found or is not text-based.";
    }

    const message = await discordTry(
      () => channel.messages.fetch(messageId),
      [RESTJSONErrorCodes.UnknownMessage],
      () => null,
    );

    if (!message) {
      return "Message not found.";
    }

    return {
      content: message.content,
      author: message.author.tag,
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map((a) => a.url),
    };
  };
};

export type InterpreterContext = {
  prisma: ExtendedPrismaClient;
  guild: Guild;
  invokedBy: GuildMember;
  channel: GuildTextBasedChannel;
};

export const createCodeInterpreter = (context: InterpreterContext) => {
  return async function interpretCode({ code }: { code: string }) {
    let result: unknown;
    await safeSendCode(context.channel.send.bind(context.channel), code, "js");
    const confirmation = new ConfirmationDialog(
      "Are you sure you want to run this code?",
      "Yes",
      "No",
      async () => {
        try {
          const fn = AsyncFunction("prisma", "guild", "moderator", "channel", code);
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

export const readInterpreterFunction = async (
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

export const snowflake = {
  type: "string",
  pattern: "^\\d+$",
  description: "A Discord snowflake. Can be parsed from mention like <@id>, <#id>.",
} as const;
