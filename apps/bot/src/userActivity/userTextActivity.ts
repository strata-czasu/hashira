import { Hashira } from "@hashira/core";
import {
  ChannelType,
  type Message,
  type MessageCreateOptions,
  RESTJSONErrorCodes,
  SnowflakeUtil,
} from "discord.js";
import { noop } from "es-toolkit";
import { base } from "../base";
import type { StickyMessageCache } from "../stickyMessage/stickyMessageCache";
import { discordTry } from "../util/discordTry";
import { errorFollowUp } from "../util/errorFollowUp";
import { fetchMessages } from "../util/fetchMessages";
import { isNotOwner } from "../util/isOwner";

const handleStickyMessage = async (
  stickyMessageCache: StickyMessageCache,
  message: Message<true>,
) => {
  if (message.author.id === message.client.user?.id) return;

  const stickyMessage = await stickyMessageCache.get(message.channel.id);
  if (!stickyMessage) return;

  discordTry(
    () => message.channel.messages.delete(stickyMessage.lastMessageId),
    [RESTJSONErrorCodes.UnknownMessage],
    noop,
  ); // just ignore the error if cannot remove the message

  const newMessage = await message.channel.send(
    stickyMessage.content as MessageCreateOptions,
  );

  await stickyMessageCache.update(message.channel.id, newMessage.id);
};

export const userTextActivity = new Hashira({ name: "user-text-activity" })
  .use(base)
  .group("user-activity", (group) =>
    group
      .setDescription("User activity related commands")
      .addCommand("preload", (cmd) =>
        cmd
          .setDescription("Preload user activity data")
          .addChannel("channel", (option) =>
            option
              .setDescription("The channel to preload")
              .setRequired(false)
              .setChannelType(ChannelType.GuildText),
          )
          .addNumber("limit", (option) =>
            option
              .setDescription("The limit of messages to preload")
              .setRequired(false)
              .setMinValue(0)
              .setMaxValue(100_000),
          )
          .addString("before", (option) =>
            option.setDescription("The id of message to start from").setRequired(false),
          )
          .handle(
            async (
              { prisma },
              { channel: rawChannel, before: rawBefore, limit: rawLimit },
              itx,
            ) => {
              if (await isNotOwner(itx.user)) return;
              if (!itx.inCachedGuild()) return;
              const channel = rawChannel ?? itx.channel;

              if (!channel) {
                return await errorFollowUp(itx, "Channel not found");
              }
              const before =
                rawBefore ??
                SnowflakeUtil.generate({ timestamp: Date.now() }).toString();
              const limit = rawLimit ?? 1000;

              await itx.reply({
                content: "Preloading messages...",
                flags: "Ephemeral",
              });

              let i = 0;
              for await (const messages of fetchMessages(channel, limit, before)) {
                const messageData = messages.map((message) => ({
                  userId: message.author.id,
                  guildId: message.guild.id,
                  messageId: message.id,
                  channelId: message.channel.id,
                  timestamp: message.createdAt,
                }));
                const userData = messageData.map((data) => ({ id: data.userId }));

                i += messageData.length;

                await itx.followUp({
                  content: `Preloaded ${i}/${limit} messages. It's ${
                    (i / limit) * 100
                  }% done. Last message: ${messages.last()?.url}`,
                  flags: "Ephemeral",
                });

                await prisma.$transaction([
                  prisma.user.createMany({ data: userData, skipDuplicates: true }),
                  prisma.userTextActivity.createMany({ data: messageData }),
                ]);
              }
            },
          ),
      ),
  )
  .handle(
    "guildMessageCreate",
    async ({ stickyMessageCache, userTextActivityQueue }, message) => {
      userTextActivityQueue.push(message.channel.id, {
        user: {
          connectOrCreate: {
            create: { id: message.author.id },
            where: { id: message.author.id },
          },
        },
        guild: { connect: { id: message.guild.id } },
        messageId: message.id,
        channelId: message.channel.id,
        timestamp: message.createdAt,
      });

      await handleStickyMessage(stickyMessageCache, message);
    },
  );
