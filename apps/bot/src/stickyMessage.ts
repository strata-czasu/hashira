import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import {
  AttachmentBuilder,
  ChannelType,
  type MessageCreateOptions,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  channelMention,
  messageLink,
} from "discord.js";
import { noop } from "es-toolkit";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import { decodeJson, encodeJson } from "./util/embedBuilder";
import { errorFollowUp } from "./util/errorFollowUp";

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
          .addString("dataurl", (attachment) =>
            attachment.setDescription("Data URL of the message to set"),
          )
          .handle(async ({ prisma }, { channel, dataurl }, itx) => {
            if (!itx.inCachedGuild()) return;
            const url = new URL(dataurl);
            const data = url.searchParams.get("data");
            if (!data) return errorFollowUp(itx, "Invalid data URL");
            const json = decodeJson(data);
            if (!json) return errorFollowUp(itx, "Invalid JSON");

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

            const message = await channel.send(json as MessageCreateOptions);

            await prisma.stickyMessage.upsert({
              where: { channelId: channel.id },
              create: {
                channelId: channel.id,
                guildId: itx.guildId,
                enabled: true,
                lastMessageId: message.id,
                content: json as Prisma.InputJsonValue,
              },
              update: {
                content: json as Prisma.InputJsonValue,
                lastMessageId: message.id,
              },
            });

            await itx.reply(`Sticky message set in ${channel}`);
          }),
      )
      .addCommand("edit-url", (command) =>
        command
          .setDescription("Get the data URL of a message for editing")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("The channel to get the data URL from")
              .setChannelType(ChannelType.GuildText),
          )
          .handle(async ({ prisma }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            const stickyMessage = await prisma.stickyMessage.findFirst({
              where: { channelId: channel.id },
            });

            if (!stickyMessage) return errorFollowUp(itx, "No sticky message found");

            const content = encodeJson(stickyMessage.content);
            const attachment = new AttachmentBuilder(Buffer.from(content), {
              name: "dataurl.txt",
            });

            await itx.reply({ files: [attachment] });
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
          .handle(async ({ prisma }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            const exists = await prisma.stickyMessage.findFirst({
              where: { channelId: channel.id },
            });

            if (!exists) return errorFollowUp(itx, "No sticky message found");

            await prisma.stickyMessage.update({
              where: { channelId: channel.id },
              data: { enabled: !exists.enabled },
            });

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

              (stickyMessage) =>
                `${channelMention(stickyMessage.channelId)}: ${messageLink(stickyMessage.channelId, stickyMessage.lastMessageId, stickyMessage.guildId)} - ${stickyMessage.enabled ? "enabled" : "disabled"}`,
            );

            await paginate.render(itx);
          }),
      ),
  );
