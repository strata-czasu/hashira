import { Hashira } from "@hashira/core";
import { bold, inlineCode } from "discord.js";
import { base } from "./base";

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
  });
