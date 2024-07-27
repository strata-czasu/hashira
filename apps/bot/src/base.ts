import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { captureException } from "@sentry/bun";
import { EmbedBuilder, type Message, channelMention } from "discord.js";
import { database } from "./db";
import { LockManager } from "./lock";
import { Logger } from "./logger";

type GuildMessage = Message<true>;
type MessageDeleteData = {
  message: GuildMessage;
};

type MessageEditData = {
  oldMessage: GuildMessage;
  newMessage: GuildMessage;
};

const getLogMessageEmbed = (message: GuildMessage, timestamp: Date) => {
  return new EmbedBuilder()
    .setAuthor({
      name: `${message.author.tag} (${message.author.id})`,
      iconURL: message.author.displayAvatarURL(),
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
          const embed = getLogMessageEmbed(message, timestamp).setDescription(
            `### Wiadomość usunięta na ${channelMention(message.channelId)}\n${
              message.content
            }`,
          );
          // TODO)) Add attachments
          return embed;
        },
      )
      .addMessageType(
        "messageUpdate",
        async ({ timestamp }, { oldMessage, newMessage }: MessageEditData) => {
          const embed = getLogMessageEmbed(newMessage, timestamp).setDescription(
            `### Wiadomość edytowana na #${channelMention(
              oldMessage.channelId,
            )}\n**Stara treść**\n${oldMessage.content}\n\n**Nowa treść**\n${
              newMessage.content
            }`,
          );
          return embed;
        },
      ),
  }));
