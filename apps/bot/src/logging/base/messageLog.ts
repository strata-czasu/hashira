import { Hashira } from "@hashira/core";
import { channelMention, type GuildBasedChannel, type Message } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type GuildMessage = Message<true>;
type MessageDeleteData = {
  message: GuildMessage;
};
type MessageEditData = {
  oldMessage: GuildMessage;
  newMessage: GuildMessage;
  oldMessageContent: string;
  newMessageContent: string;
};

const linkMessage = (message: GuildMessage) => `[Wiadomość](${message.url})`;

const linkChannel = (channel: GuildBasedChannel) =>
  `${channelMention(channel.id)} (${channel.name})`;

const getMessageUpdateLogContent = (message: GuildMessage, content: string) => {
  let out = content;
  if (message.attachments.size > 0) {
    out += `\n\n**Załączniki**\n${message.attachments.map((a) => `- ${a.proxyURL}`).join("\n")}`;
  }
  return out;
};

export const messageLog = new Hashira({ name: "messageLog" }).const(
  "messageLog",
  new Logger()
    .addMessageType(
      "messageDelete",
      async ({ timestamp }, { message }: MessageDeleteData) => {
        const embed = getLogMessageEmbed(message.author, timestamp)
          .setDescription(
            `**${linkMessage(message)} usunięta na ${linkChannel(message.channel)}**\n${
              message.content
            }`,
          )
          .setColor("Red");

        if (message.attachments.size > 0) {
          const fieldName = message.attachments.size > 1 ? "Załączniki" : "Załącznik";
          embed.addFields([
            {
              name: fieldName,
              value: message.attachments.map((a) => `- ${a.proxyURL}`).join("\n"),
            },
          ]);
        }

        return embed;
      },
    )
    .addMessageType(
      "messageUpdate",
      async (
        { timestamp },
        {
          oldMessage,
          newMessage,
          oldMessageContent,
          newMessageContent,
        }: MessageEditData,
      ) => {
        const lines = [
          `**${linkMessage(newMessage)} edytowana na ${linkChannel(newMessage.channel)}**`,
          `### Stara wiadomość\n${getMessageUpdateLogContent(oldMessage, oldMessageContent)}`,
          `### Nowa wiadomość\n${getMessageUpdateLogContent(newMessage, newMessageContent)}`,
        ];
        const embed = getLogMessageEmbed(newMessage.author, timestamp)
          .setDescription(lines.join("\n"))
          .setColor("Yellow");

        return embed;
      },
    ),
);
