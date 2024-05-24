import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, RESTJSONErrorCodes, bold, userMention } from "discord.js";
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
  .command("dm", (command) =>
    command
      .setDescription("Wyślij prywatną wiaodmość")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .addString("content", (content) => content.setDescription("Treść wiadomości"))
      .handle(async (_, { user: rawUser, content }, itx) => {
        if (rawUser.id === itx.client.user.id) {
          await itx.reply({
            content: "Nie mogę wysłać wiadomości do siebie",
            ephemeral: true,
          });
          return;
        }
        await itx.deferReply();

        const user = await discordTry(
          async () => itx.client.users.fetch(rawUser.id),
          [RESTJSONErrorCodes.UnknownMember],
          async () => {
            await errorFollowUp(itx, "Nie znaleziono użytkownika na serwerze");
            return null;
          },
        );
        if (!user) return;

        const logChannel = await itx.client.channels.fetch(DM_FORWARD_CHANNEL_ID);

        const messageSent = await sendDirectMessage(user, content);
        if (messageSent) {
          await itx.editReply(
            `Wysłano wiadomość do ${userMention(user.id)}: ${content}`,
          );
          if (logChannel?.isTextBased()) {
            logChannel.send(`${bold(itx.user.tag)} -> ${bold(user.tag)}: ${content}`);
          }
        } else {
          await itx.editReply("Nie udało się wysłać wiadomości");
        }
      }),
  );
