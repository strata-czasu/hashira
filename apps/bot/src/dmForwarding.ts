import { Hashira, PaginatedView } from "@hashira/core";
import { TextChannelPaginator } from "@hashira/core/paginate";
import {
  type Message,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  bold,
  time,
  userMention,
} from "discord.js";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";
import { sendDirectMessage } from "./util/sendDirectMessage";

const DM_FORWARD_CHANNEL_ID = "1240038565275238430";

export const dmForwarding = new Hashira({ name: "dmForwarding" })
  .use(base)
  .handle("directMessageCreate", async (_, message) => {
    if (message.author.bot) return;
    if (!message.channel.isDMBased()) return;

    const channel = await discordTry(
      async () => message.client.channels.fetch(DM_FORWARD_CHANNEL_ID),
      [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.MissingAccess],
      () => null,
    );
    if (!channel || !channel.isTextBased()) return;

    await discordTry(
      async () =>
        channel.send({
          content: `${bold(message.author.tag)}: ${message.content}`,
          embeds: message.embeds,
          files: message.attachments.map((attachment) => attachment.url),
        }),
      [RESTJSONErrorCodes.MissingAccess],
      () => console.warn("Missing access to send message to DM forward channel"),
    );
  })
  .group("dm", (group) =>
    group
      .setDescription("Komendy do zarządzania prywatnymi wiadomościami")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("send", (command) =>
        command
          .setDescription("Wyślij prywatną wiaodmość")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("content", (content) => content.setDescription("Treść wiadomości"))
          .handle(async (_, { user, content }, itx) => {
            if (user.id === itx.client.user.id) {
              await itx.reply({
                content: "Nie mogę wysłać wiadomości do siebie",
                ephemeral: true,
              });
              return;
            }
            await itx.deferReply();

            const logChannel = await itx.client.channels.fetch(DM_FORWARD_CHANNEL_ID);

            const messageSent = await sendDirectMessage(user, content);
            if (messageSent) {
              await itx.editReply(
                `Wysłano wiadomość do ${userMention(user.id)}: ${content}`,
              );
              if (logChannel?.isTextBased()) {
                logChannel.send(
                  `${bold(itx.user.tag)} -> ${bold(user.tag)}: ${content}`,
                );
              }
            } else {
              await itx.editReply("Nie udało się wysłać wiadomości");
            }
          }),
      )
      .addCommand("history", (command) =>
        command
          .setDescription("Wyświetl historię wiadomości")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async (_, { user }, itx) => {
            await itx.deferReply();

            if (user.id === itx.client.user.id) {
              return await errorFollowUp(
                itx,
                "Nie mogę wyświetlić historii wiadomości z samym sobą",
              );
            }

            await user.createDM();
            if (!user.dmChannel) {
              return errorFollowUp(
                itx,
                "Nie mogę wyświetlić historii wiadomości z tym użytkownikiem",
              );
            }

            const paginator = new TextChannelPaginator({
              channel: user.dmChannel,
              pageSize: 15,
            });

            const formatMessage = (message: Message) =>
              `${time(message.createdTimestamp, TimestampStyles.ShortTime)} ${bold(
                message.author.username,
              )}: ${message.content}`;

            const paginatedView = new PaginatedView(
              paginator,
              `Historia wiadomości z ${user.tag}`,
              formatMessage,
              false,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
