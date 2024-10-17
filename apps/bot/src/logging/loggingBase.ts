import { Hashira } from "@hashira/core";
import type { Mute, Warn } from "@hashira/db";
import { type Duration, formatDuration } from "date-fns";
import {
  EmbedBuilder,
  type GuildBan,
  type GuildBasedChannel,
  GuildMember,
  type Message,
  type Role,
  TimestampStyles,
  type User,
  bold,
  channelMention,
  inlineCode,
  italic,
  roleMention,
  time,
  userMention,
} from "discord.js";
import { formatMuteLength } from "../moderation/util";
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
type GuildMemberRemoveData = { member: GuildMember; roles: Role[] };
type GuildMemberNicknameUpdateData = {
  member: GuildMember;
  oldNickname: string | null;
  newNickname: string | null;
};

type WarnCreateData = { warn: Warn; moderator: User };
type WarnRemoveData = { warn: Warn; moderator: User; removeReason: string | null };
type WarnEditData = {
  warn: Warn;
  moderator: User;
  oldReason: string;
  newReason: string;
};
type MuteCreateData = { mute: Mute; moderator: User };
type MuteRemoveData = { mute: Mute; moderator: User; removeReason: string | null };
type MuteEditData = {
  mute: Mute;
  moderator: User;
  oldReason: string;
  newReason: string | null;
  oldDuration: Duration;
  newDuration: Duration | null;
};
type GuildBanAddData = { reason: string | null; user: User; moderator: User | null };
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

const getWarnLogHeader = (action: string, warn: Warn) =>
  `**${action} ostrzeżenie [${inlineCode(warn.id.toString())}] dla ${userMention(warn.userId)} (${warn.userId})**`;

const getMuteLogHeader = (action: string, mute: Mute) =>
  `**${action} wyciszenie [${inlineCode(mute.id.toString())}] dla ${userMention(mute.userId)} (${mute.userId})**`;

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
        async ({ timestamp }, { member, roles }: GuildMemberRemoveData) => {
          const embed = getLogMessageEmbed(member, timestamp)
            .setDescription("**Opuszcza serwer**")
            .setColor("Red");

          if (roles.length > 0) {
            embed.addFields([
              {
                name: "Role",
                value: roles
                  .map((r) => `- ${roleMention(r.id)} (${r.name})`)
                  .join("\n"),
              },
            ]);
          }

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
    "moderationLog",
    new Logger()
      .addMessageType(
        "warnCreate",
        async ({ timestamp }, { warn, moderator }: WarnCreateData) => {
          return getLogMessageEmbed(moderator, timestamp)
            .setDescription(
              `${getWarnLogHeader("Nadaje", warn)}\nPowód: ${italic(warn.reason)}`,
            )
            .setColor("Green");
        },
      )
      .addMessageType(
        "warnRemove",
        async ({ timestamp }, { warn, moderator, removeReason }: WarnRemoveData) => {
          let content = `${getWarnLogHeader("Usuwa", warn)}\nPowód warna: ${italic(warn.reason)}`;
          if (removeReason) content += `\nPowód usunięcia: ${italic(removeReason)}`;
          return getLogMessageEmbed(moderator, timestamp)
            .setDescription(content)
            .setColor("Red");
        },
      )
      .addMessageType(
        "warnEdit",
        async (
          { timestamp },
          { warn, moderator, oldReason, newReason }: WarnEditData,
        ) => {
          return getLogMessageEmbed(moderator, timestamp)
            .setDescription(
              `${getWarnLogHeader("Edytuje", warn)}\nStary powód: ${italic(oldReason)}\nNowy powód: ${italic(newReason)}`,
            )
            .setColor("Yellow");
        },
      )
      .addMessageType(
        "muteCreate",
        async ({ timestamp }, { mute, moderator }: MuteCreateData) => {
          return getLogMessageEmbed(moderator, timestamp)
            .setDescription(
              `${getMuteLogHeader("Nadaje", mute)}\nCzas trwania: ${formatMuteLength(mute)}\nKoniec: ${time(mute.endsAt, TimestampStyles.RelativeTime)}\nPowód: ${italic(mute.reason)}`,
            )
            .setColor("Green");
        },
      )
      .addMessageType(
        "muteRemove",
        async ({ timestamp }, { mute, moderator, removeReason }: MuteRemoveData) => {
          let content = `${getMuteLogHeader("Usuwa", mute)}\nPowód mute: ${italic(mute.reason)}`;
          if (removeReason) content += `\nPowód usunięcia: ${italic(removeReason)}`;
          return getLogMessageEmbed(moderator, timestamp)
            .setDescription(content)
            .setColor("Yellow");
        },
      )
      .addMessageType(
        "muteEdit",
        async (
          { timestamp },
          {
            mute,
            moderator,
            oldReason,
            newReason,
            oldDuration,
            newDuration,
          }: MuteEditData,
        ) => {
          let content = getMuteLogHeader("Edytuje", mute);
          if (newReason)
            content += `\nStary powód: ${italic(oldReason)}\nNowy powód: ${italic(newReason)}`;
          if (newDuration)
            content += `\nStary czas trwania: ${formatDuration(oldDuration)}\nNowy czas trwania: ${formatDuration(newDuration)}`;
          return getLogMessageEmbed(moderator, timestamp)
            .setDescription(content)
            .setColor("Yellow");
        },
      )
      .addMessageType(
        "guildBanAdd",
        async ({ timestamp }, { reason, user, moderator }: GuildBanAddData) => {
          const content: string[] = [bold("Otrzymuje bana")];

          if (reason) content.push(`Powód: ${italic(reason)}`);

          const moderatorMentionString = moderator
            ? userMention(moderator.id)
            : "Nieznany";

          content.push(`Moderator: ${moderatorMentionString}`);

          const embed = getLogMessageEmbed(user, timestamp)
            .setDescription(content.join("\n"))
            .setColor("Red");
          return embed;
        },
      )
      // TODO)) Add moderator, remove reason and reason when using /unban
      //        This info is missing when receiving the ban event from Discord
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
