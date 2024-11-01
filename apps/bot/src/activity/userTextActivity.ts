import { Hashira } from "@hashira/core";
import { ChannelType, SnowflakeUtil } from "discord.js";
import { base } from "../base";
import { ensureUserExists } from "../util/ensureUsersExist";
import { fetchMessages } from "../util/fetchMessages";
import { isOwner } from "../util/isOwner";

// TODO: this could be merged with the emojiCounting plugin
export const userTextActivity = new Hashira({ name: "user-text-activity" })
  .use(base)
  .group("user-text-activity", (group) =>
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
              if (!(await isOwner(itx))) return;
              if (!itx.inCachedGuild()) return;
              const channel = rawChannel ?? itx.channel;

              if (!channel) {
                await itx.reply({ content: "Channel not found", ephemeral: true });
                return;
              }
              const before =
                rawBefore ??
                SnowflakeUtil.generate({ timestamp: Date.now() }).toString();
              const limit = rawLimit ?? 1000;

              await itx.reply({
                content: "Preloading messages...",
                ephemeral: true,
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
                  ephemeral: true,
                  content: `Preloaded ${i}/${limit} messages. It's ${
                    (i / limit) * 100
                  }% done. Last message: ${messages.last()?.url}`,
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
  .handle("guildMessageCreate", async ({ prisma }, message) => {
    await ensureUserExists(prisma, message.author);

    await prisma.userTextActivity.create({
      data: {
        userId: message.author.id,
        guildId: message.guild.id,
        messageId: message.id,
        channelId: message.channel.id,
        timestamp: message.createdAt,
      },
    });
  });
