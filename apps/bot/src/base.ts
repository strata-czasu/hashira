import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { captureException } from "@sentry/bun";
import {
  EmbedBuilder,
  type GuildBan,
  GuildMember,
  type Message,
  type User,
  channelMention,
} from "discord.js";
import { database } from "./db";
import { LockManager } from "./lock";
import { Logger } from "./logger";

// TODO)) Move log event declarations to a separate module
type GuildMessage = Message<true>;
type MessageDeleteData = {
  message: GuildMessage;
};
type MessageEditData = {
  oldMessage: GuildMessage;
  newMessage: GuildMessage;
};
type GuildMemberAddData = { member: GuildMember };
type GuildMemberRemoveData = { member: GuildMember };
type GuildBanAddData = { ban: GuildBan };
type GuildBanRemoveData = { ban: GuildBan };

const getLogMessageEmbed = (author: User | GuildMember, timestamp: Date) => {
  const user = author instanceof GuildMember ? author.user : author;
  return new EmbedBuilder()
    .setAuthor({
      name: `${user.tag} (${user.id})`,
      iconURL: user.displayAvatarURL(),
    })
    .setTimestamp(timestamp);
};

export const base = new Hashira({ name: "base" })
  .use(database)
  .addExceptionHandler("default", (e) => {
    if (env.SENTRY_DSN) captureException(e);
    console.error(e);
  })
  .const((ctx) => ({
    ...ctx,
    lock: new LockManager(),
    log: new Logger()
      .addMessageType(
        "messageDelete",
        async ({ timestamp }, { message }: MessageDeleteData) => {
          const embed = getLogMessageEmbed(message.author, timestamp)
            .setDescription(
              `### Wiadomość usunięta na ${channelMention(message.channelId)}\n${
                message.content
              }`,
            )
            .setColor("Red");
          // TODO)) Add attachments
          return embed;
        },
      )
      .addMessageType(
        "messageUpdate",
        async ({ timestamp }, { oldMessage, newMessage }: MessageEditData) => {
          const embed = getLogMessageEmbed(newMessage.author, timestamp)
            .setDescription(
              `### Wiadomość edytowana na #${channelMention(
                oldMessage.channelId,
              )}\n**Stara treść**\n${oldMessage.content}\n\n**Nowa treść**\n${
                newMessage.content
              }`,
            )
            .setColor("Yellow");
          // TODO)) Add attachments
          return embed;
        },
      )
      .addMessageType(
        "guildMemberAdd",
        async ({ timestamp }, { member }: GuildMemberAddData) => {
          const embed = getLogMessageEmbed(member, timestamp)
            .setDescription("### Dołącza do serwera")
            .setColor("Green");
          return embed;
        },
      )
      .addMessageType(
        "guildMemberRemove",
        async ({ timestamp }, { member }: GuildMemberRemoveData) => {
          const embed = getLogMessageEmbed(member, timestamp)
            .setDescription("### Opuszcza serwer")
            .setColor("Red");
          return embed;
        },
      )
      .addMessageType(
        "guildBanAdd",
        async ({ timestamp }, { ban }: GuildBanAddData) => {
          const embed = getLogMessageEmbed(ban.user, timestamp)
            .setDescription("### Otrzymuje bana")
            .setColor("Red");
          return embed;
        },
      )
      .addMessageType(
        "guildBanRemove",
        async ({ timestamp }, { ban }: GuildBanRemoveData) => {
          const embed = getLogMessageEmbed(ban.user, timestamp)
            .setDescription("### Zdjęto bana")
            .setColor("Green");
          return embed;
        },
      ),
  }));
