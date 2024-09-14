import { Hashira } from "@hashira/core";
import {
  EmbedBuilder,
  type GuildBan,
  type GuildBasedChannel,
  GuildMember,
  type Message,
  type User,
  channelMention,
  inlineCode,
  italic,
} from "discord.js";
import { Logger } from "./logger";

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
type GuildMemberAddData = { member: GuildMember };
type GuildMemberRemoveData = { member: GuildMember };
type GuildMemberNicknameUpdateData = {
  member: GuildMember;
  oldNickname: string | null;
  newNickname: string | null;
};
type GuildBanAddData = { ban: GuildBan };
type GuildBanRemoveData = { ban: GuildBan };

const linkMessage = (message: GuildMessage) => `[Wiadomość](${message.url})`;
const linkChannel = (channel: GuildBasedChannel) =>
  `${channelMention(channel.id)} (${channel.name})`;

const getLogMessageEmbed = (author: User | GuildMember, timestamp: Date) => {
  const user = author instanceof GuildMember ? author.user : author;
  return new EmbedBuilder()
    .setAuthor({
      name: `${user.tag} (${user.id})`,
      iconURL: user.displayAvatarURL(),
    })
    .setTimestamp(timestamp);
};

const getMessageUpdateLogContent = (message: GuildMessage, content: string) => {
  let out = content;
  if (message.attachments.size > 0) {
    out += `\n\n**Załączniki**\n${message.attachments.map((a) => `- ${a.proxyURL}`).join("\n")}`;
  }
  return out;
};

// Base definition of loggers and log message types
export const loggingBase = new Hashira({ name: "loggingBase" })
  .const(
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
          const embed = getLogMessageEmbed(newMessage.author, timestamp)
            .setDescription(
              `**${linkMessage(newMessage)} edytowana na ${linkChannel(newMessage.channel)}**`,
            )
            .setColor("Yellow");

          embed.addFields([
            {
              name: "Stara wiadomość",
              value: getMessageUpdateLogContent(oldMessage, oldMessageContent),
            },
            {
              name: "Nowa wiadomość",
              value: getMessageUpdateLogContent(newMessage, newMessageContent),
            },
          ]);

          return embed;
        },
      ),
  )
  .const(
    "memberLog",
    new Logger()
      .addMessageType(
        "guildMemberAdd",
        async ({ timestamp }, { member }: GuildMemberAddData) => {
          const embed = getLogMessageEmbed(member, timestamp)
            .setDescription("**Dołącza do serwera**")
            .setColor("Green");
          return embed;
        },
      )
      .addMessageType(
        "guildMemberRemove",
        async ({ timestamp }, { member }: GuildMemberRemoveData) => {
          const embed = getLogMessageEmbed(member, timestamp)
            .setDescription("**Opuszcza serwer**")
            .setColor("Red");
          return embed;
        },
      ),
  )
  .const(
    "profileLog",
    new Logger().addMessageType(
      "guildMemberNicknameUpdate",
      async (
        { timestamp },
        { member, oldNickname, newNickname }: GuildMemberNicknameUpdateData,
      ) => {
        const embed = getLogMessageEmbed(member, timestamp).setColor("Yellow");

        if (oldNickname === null && newNickname !== null) {
          embed.setDescription(`**Ustawia nick na** ${inlineCode(newNickname)}`);
        } else if (oldNickname !== null && newNickname !== null) {
          embed.setDescription(
            `**Zmienia nick z** ${inlineCode(oldNickname)} **na** ${inlineCode(newNickname)}`,
          );
        } else if (oldNickname !== null && newNickname === null) {
          embed.setDescription(`**Usuwa nick** ${inlineCode(oldNickname)}`);
        } else {
          throw new Error("Nickname update from null to null");
        }

        return embed;
      },
    ),
  )
  .const(
    "banLog",
    new Logger()
      .addMessageType(
        "guildBanAdd",
        async ({ timestamp }, { ban }: GuildBanAddData) => {
          let content = "**Otrzymuje bana**";
          if (ban.reason) content += `\nPowód: ${italic(ban.reason)}`;
          const embed = getLogMessageEmbed(ban.user, timestamp)
            .setDescription(content)
            .setColor("Red");
          return embed;
        },
      )
      .addMessageType(
        "guildBanRemove",
        async ({ timestamp }, { ban }: GuildBanRemoveData) => {
          let content = "**Zdjęto bana**";
          if (ban.reason) content += `\nPowód: ${italic(ban.reason)}`;
          const embed = getLogMessageEmbed(ban.user, timestamp)
            .setDescription(content)
            .setColor("Green");
          return embed;
        },
      ),
  );
