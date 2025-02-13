import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type ExtendedPrismaClient } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { endOfMonth } from "date-fns";
import {
  ChannelType,
  type Message,
  type MessageCreateOptions,
  RESTJSONErrorCodes,
  SnowflakeUtil,
} from "discord.js";
import { noop } from "es-toolkit";
import { base } from "../base";
import { parseDate } from "../util/dateParsing";
import { discordTry } from "../util/discordTry";
import { errorFollowUp } from "../util/errorFollowUp";
import { fetchMessages } from "../util/fetchMessages";
import { isNotOwner } from "../util/isOwner";
import { createPluralize } from "../util/pluralize";

const handleStickyMessage = async (
  prisma: ExtendedPrismaClient,
  message: Message<true>,
) => {
  if (message.author.id === message.client.user?.id) return;

  const stickyMessage = await prisma.stickyMessage.findFirst({
    where: { channelId: message.channel.id, enabled: true },
  });

  if (!stickyMessage) return;

  discordTry(
    () => message.channel.messages.delete(stickyMessage.lastMessageId),
    [RESTJSONErrorCodes.UnknownMessage],
    noop,
  ); // just ignore the error if cannot remove the message

  const newMessage = await message.channel.send(
    stickyMessage.content as MessageCreateOptions,
  );

  await prisma.stickyMessage.update({
    where: { channelId: message.channel.id },
    data: { lastMessageId: newMessage.id },
  });
};

export const pluralizeMessages = createPluralize({
  // FIXME: Keys should be sorted automatically
  2: "wiadomości",
  1: "wiadomość",
});

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
  .group("ranking", (group) =>
    group
      .setDescription("Komendy związane z rankingami")
      .addCommand("kanał", (command) =>
        command
          .setDescription("Ranking użytkowników na podstawie aktywności tekstowej")
          .addChannel("kanał", (channel) =>
            channel.setDescription("Kanał").setChannelType(ChannelType.GuildText),
          )
          .addString("okres", (period) =>
            period.setDescription("Okres czasu, np. 2025-01"),
          )
          .handle(async ({ prisma }, { kanał: channel, okres: rawPeriod }, itx) => {
            if (!itx.inCachedGuild()) return;

            const periodStart = parseDate(rawPeriod, "start", null);
            if (!periodStart) {
              return await errorFollowUp(itx, "Nieprawidłowy okres. Przykład: 2025-01");
            }
            const periodEnd = endOfMonth(periodStart);

            const where = {
              guildId: itx.guild.id,
              channelId: channel.id,
              timestamp: {
                gte: periodStart,
                lte: periodEnd,
              },
            };
            const paginate = new DatabasePaginator(
              (props, ordering) =>
                prisma.userTextActivity.groupBy({
                  ...props,
                  by: "userId",
                  where,
                  _count: true,
                  orderBy: [{ _count: { userId: ordering } }, { userId: ordering }],
                }),
              async () => {
                const count = await prisma.userTextActivity.groupBy({
                  by: "userId",
                  where,
                });
                return count.length;
              },
              { pageSize: 20, defaultOrder: PaginatorOrder.DESC },
            );

            const paginator = new PaginatedView(
              paginate,
              `Ranking wiadomości tekstowych na kanale ${channel.name} (${rawPeriod})`,
              (item, idx) =>
                `${idx}. <@${item.userId}> - ${item._count} ${pluralizeMessages(item._count)}`,
              false,
            );
            await paginator.render(itx);
          }),
      ),
  )
  .handle("guildMessageCreate", async ({ prisma, userTextActivityQueue }, message) => {
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

    await handleStickyMessage(prisma, message);
  });
