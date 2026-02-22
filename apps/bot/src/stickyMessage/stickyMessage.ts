import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import {
  ChannelType,
  channelMention,
  type MessageCreateOptions,
  messageLink,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord.js";
import { noop } from "es-toolkit";
import { base } from "../base";
import {
  createShareLink,
  getShareLinkData,
  parseShareId,
  type ShareLinkData,
  toMessageCreateOptions,
} from "../util/discohook";
import { discordTry } from "../util/discordTry";
import { errorFollowUp } from "../util/errorFollowUp";

export const stickyMessage = new Hashira({ name: "sticky-message" })
  .use(base)
  .group("sticky-message", (group) =>
    group
      .setDescription("Commands related to sticky messages")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("set", (command) =>
        command
          .setDescription("Set a sticky message")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("The channel to set the sticky message in")
              .setChannelType(ChannelType.GuildText),
          )
          .addString("share-link", (attachment) =>
            attachment.setDescription("Discohook share link or share ID"),
          )
          .handle(
            async (
              { prisma, stickyMessageCache },
              { channel, "share-link": shareLink },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              let shareId: string;
              try {
                shareId = parseShareId(shareLink);
              } catch {
                return errorFollowUp(itx, "Invalid Discohook share link");
              }

              let shareData: ShareLinkData;
              try {
                const result = await getShareLinkData(shareId);
                if (!result.success) {
                  const errorMessage = result.issues
                    .map((err) => err.message)
                    .join(", ");
                  throw new Error(`Invalid share link data: ${errorMessage}`);
                }

                shareData = result.output.data;
              } catch (e) {
                const message =
                  e instanceof Error ? e.message : "Failed to fetch share link";
                return errorFollowUp(itx, message);
              }

              if (shareData.messages.length === 0) {
                return errorFollowUp(
                  itx,
                  "Share link contains no messages. Please use a share link with at least one message.",
                );
              }

              if (shareData.messages.length > 1) {
                return errorFollowUp(
                  itx,
                  "Share link contains multiple messages. Please use a share link with only one message.",
                );
              }

              // biome-ignore lint/style/noNonNullAssertion: we know that messages has at least one message because of the check above
              const discohookMessage = shareData.messages[0]!;
              const messageData = toMessageCreateOptions(discohookMessage.data);

              const exists = await prisma.stickyMessage.findFirst({
                where: { channelId: channel.id },
              });

              if (exists) {
                await discordTry(
                  () => channel.messages.delete(exists.lastMessageId),
                  [RESTJSONErrorCodes.UnknownMessage],
                  noop,
                );
              }

              const message = await channel.send(messageData as MessageCreateOptions);

              await prisma.stickyMessage.upsert({
                where: { channelId: channel.id },
                create: {
                  channelId: channel.id,
                  guildId: itx.guildId,
                  enabled: true,
                  lastMessageId: message.id,
                  content: messageData as Prisma.InputJsonValue,
                },
                update: {
                  content: messageData as Prisma.InputJsonValue,
                  lastMessageId: message.id,
                },
              });

              stickyMessageCache.invalidate(channel.id);

              await itx.reply(`Sticky message set in ${channel}`);
            },
          ),
      )
      .addCommand("edit-link", (command) =>
        command
          .setDescription("Get a Discohook share link for editing a sticky message")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("The channel to get the share link from")
              .setChannelType(ChannelType.GuildText),
          )
          .handle(async ({ prisma }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            const stickyMessage = await prisma.stickyMessage.findFirst({
              where: { channelId: channel.id },
            });

            if (!stickyMessage) return errorFollowUp(itx, "No sticky message found");

            try {
              const shareLink = await createShareLink(stickyMessage.content);
              await itx.reply({ content: shareLink.url });
            } catch (e) {
              const message =
                e instanceof Error ? e.message : "Failed to create share link";
              return errorFollowUp(itx, message);
            }
          }),
      )
      .addCommand("toggle", (command) =>
        command
          .setDescription("Toggle a sticky message")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("The channel to toggle the sticky message in")
              .setChannelType(ChannelType.GuildText),
          )
          .handle(async ({ prisma, stickyMessageCache }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            const exists = await prisma.stickyMessage.findFirst({
              where: { channelId: channel.id },
            });

            if (!exists) return errorFollowUp(itx, "No sticky message found");

            await prisma.stickyMessage.update({
              where: { channelId: channel.id },
              data: { enabled: !exists.enabled },
            });

            stickyMessageCache.invalidate(channel.id);

            await itx.reply(
              `${channelMention(channel.id)}: ${
                exists.enabled ? "disabled" : "enabled"
              }`,
            );
          }),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("List all sticky messages")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const paginator = new DatabasePaginator(
              (props) =>
                prisma.stickyMessage.findMany({
                  ...props,
                  where: { guildId: itx.guildId },
                }),
              () => prisma.stickyMessage.count({ where: { guildId: itx.guildId } }),
            );

            const paginate = new PaginatedView(
              paginator,
              "sticky messages",

              (stickyMessage) => {
                const mention = channelMention(stickyMessage.channelId);
                const link = messageLink(
                  stickyMessage.channelId,
                  stickyMessage.lastMessageId,
                  stickyMessage.guildId,
                );
                const enabled = stickyMessage.enabled ? "enabled" : "disabled";
                const cached = stickyMessage.enabled ? "cached" : "not cached";

                return `${mention}: ${link} - ${enabled} (${cached})`;
              },
            );

            await paginate.render(itx);
          }),
      )
      .addCommand("refresh", (command) =>
        command
          .setDescription("Refresh a sticky message cache for a channel")
          .addChannel("channel", (channel) =>
            channel.setDescription("The channel to refresh the sticky message in"),
          )
          .handle(async ({ stickyMessageCache }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            stickyMessageCache.invalidate(channel.id);

            await itx.reply(`Refreshed sticky message in ${channel}`);
          }),
      ),
  );
