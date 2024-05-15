import { Hashira } from "@hashira/core";
import {
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  bold,
  inlineCode,
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

    const channel = await message.client.channels.fetch(DM_FORWARD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;

    await channel.send({
      content: `${bold(message.author.tag)} (${inlineCode(message.author.id)}): ${
        message.content
      }`,
      embeds: message.embeds,
      files: message.attachments.map((attachment) => attachment.url),
    });
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

        const messageSent = await sendDirectMessage(user, content);

        await itx.editReply(`Wysłano wiadomość do ${userMention(user.id)}: ${content}`);
        if (!messageSent) {
          await itx.followUp("Nie udało się wysłać wiadomości");
        }
      }),
  );
