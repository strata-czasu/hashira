import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { captureException } from "@sentry/bun";
import type { Message } from "discord.js";
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
      .addMessageType("messageDelete", async (_, { message }: MessageDeleteData) => {
        return `Message by ${message.author.tag} in ${message.channel.name} deleted: ${message.content}`;
      })
      .addMessageType(
        "messageUpdate",
        async (_, { oldMessage, newMessage }: MessageEditData) => {
          return `Message by ${oldMessage.author.tag} in ${oldMessage.channel.name} edited: ${oldMessage.content} -> ${newMessage.content}`;
        },
      ),
  }));
