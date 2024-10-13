import * as v from "valibot";
import parseDiscordUrl from "../../util/parseDiscordMessageUrl";
import type { Creator, Tool } from "./util/tool";

const createReadMessageSchema = v.object({
  messageLink: v.pipe(
    v.string(),
    v.description(
      "Link to the message to be read, e.g. https://discord.com/channels/guildId/channelId/messageId",
    ),
  ),
});

const createReadMessage: Creator<typeof createReadMessageSchema> = (_, { guild }) => {
  async function readMessage({
    messageLink,
  }: v.InferInput<typeof createReadMessageSchema>) {
    const messageUrl = parseDiscordUrl(messageLink);

    if (!messageUrl) return "Invalid message link";
    const channel = guild.channels.cache.get(messageUrl.channelId);
    if (!channel) return "Channel not found";
    if (!channel.isTextBased()) return "Channel is not a text channel";
    const message = await channel.messages.fetch(messageUrl.messageId);

    return message.content;
  }

  return readMessage;
};

export default {
  schema: createReadMessageSchema,
  creator: createReadMessage,
  name: "readMessage",
  description: "Read a message from a given link",
} as Tool<typeof createReadMessageSchema>;
