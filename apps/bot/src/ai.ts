import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { format } from "date-fns";
import { ChannelType, type Message, RESTJSONErrorCodes, userMention } from "discord.js";
import OpenAI from "openai";
import {
  createFetchMessage,
  createGetLatestMutes,
  createGetLatestWarns,
  createMute,
  readInterpreterFunction,
  snowflake,
} from "./ai/tools";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import safeSendLongMessage from "./util/safeSendLongMessage";

const extractImagesFromMessage = (message: Message) => {
  const images: string[] = [];

  for (const attachment of message.attachments.values()) {
    if (attachment.contentType?.startsWith("image/")) {
      images.push(attachment.url);
    }
  }

  for (const embed of message.embeds) {
    if (embed.image?.url) {
      images.push(embed.image.url);
    }
    if (embed.thumbnail?.url) {
      images.push(embed.thumbnail.url);
    }
  }

  return images;
};

type AudioFile = {
  url: string;
  contentType: string;
  name: string;
};

const extractAudioFromMessage = (message: Message) => {
  const audio: AudioFile[] = [];

  for (const attachment of message.attachments.values()) {
    if (attachment.contentType?.startsWith("audio/")) {
      audio.push({
        url: attachment.url,
        contentType: attachment.contentType,
        name: attachment.name,
      });
    }
  }

  return audio;
};

const transcribeAudio = async (
  ai: OpenAI,
  audioFile: AudioFile,
): Promise<string | null> => {
  try {
    const response = await fetch(audioFile.url);
    if (!response.ok) {
      console.error(
        `Failed to fetch audio from ${audioFile.url}: ${response.statusText}`,
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    const file = new File([buffer], audioFile.name, {
      type: audioFile.contentType,
    });

    const transcription = await ai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
    });

    return transcription.text;
  } catch (error) {
    console.error(`Failed to transcribe audio from ${audioFile.url}:`, error);
    return null;
  }
};

export const ai = new Hashira({ name: "ai" })
  .use(base)
  .const("ai", env.OPENAI_KEY ? new OpenAI({ apiKey: env.OPENAI_KEY }) : null)
  .handle(
    "messageCreate",
    async ({ ai, prisma, messageQueue, moderationLog }, message) => {
      if (!ai) return;
      if (message.author.bot) return;
      if (!message.inGuild()) return;
      if (message.channel.type !== ChannelType.GuildText) return;
      if (!message.member) return;
      if (!message.member.permissions.has("ModerateMembers")) return;
      const botMention = userMention(message.client.user.id);
      if (!message.content.startsWith(botMention)) return;
      const content = message.content.slice(botMention.length).trim();
      if (!content) return;

      const thread = await message.startThread({ name: "AI Command" });

      const reference = message.reference;
      const repliedMessage = reference?.messageId
        ? await discordTry(
            () => message.channel.messages.fetch(reference.messageId as string),
            [RESTJSONErrorCodes.UnknownMessage],
            () => null,
          )
        : null;

      const prompt = [
        "You are Biszkopt, an advanced AI moderation assistant for a Discord server. You identify as male.",
        "Your responsibilities include analyzing user behavior, checking moderation history, and executing punishments using available tools.",
        "You're capable of seeing images and transcribing audio messages to better understand user context, but the data is already provided to you; you don't need to ask for it again.",
        "Sometimes you may be asked for more entertainment-oriented tasks, which you should follow.",
        "Directives:",
        "1. Language: Always respond in Polish.",
        "2. Tone: Professional, objective, and concise. Avoid unnecessary pleasantries. Even if user is rude, maintain composure and respond according to their request.",
        "3. Tools: Use the provided tools to fetch information or perform actions. Do not guess or hallucinate information.",
        "4. Missing Info: If some information (e.g. User ID) is not provided, ask for it explicitly in a new message. You cannot work multi-turn as you have no memory. Never ask user for a follow-up in this same thread; you can only respond once.",
        "5. Scope: Focus solely on moderation and server management tasks. Entertainment requests are secondary, but should be followed. If you're asked to perform a specific task (e.g. transcription, reading from image), comply with it.",
        `Current time: ${format(new Date(), "EEEE yyyy-MM-dd HH:mm:ss XXX")}`,
      ];

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: prompt.join("\n"),
        },
      ];

      if (repliedMessage) {
        const repliedImages = extractImagesFromMessage(repliedMessage);
        const repliedAudio = extractAudioFromMessage(repliedMessage);
        const repliedContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
          {
            type: "text",
            text: "You are provided with the following information from a replied message to help you understand the context of the user's request.",
          },
          {
            type: "text",
            text: `Message author: ${repliedMessage.author.tag} (ID: ${repliedMessage.author.id}). Current member nickname: ${repliedMessage.member?.nickname ?? "N/A"}.`,
          },
          {
            type: "text",
            text: `Message content:`,
          },
          {
            type: "text",
            text: repliedMessage.content,
          },
        ];

        const transcriptions = await Promise.all(
          repliedAudio.map((a) => transcribeAudio(ai, a)),
        );

        for (const [index, text] of transcriptions.entries()) {
          if (text) {
            repliedContent.push({
              type: "text",
              text: `Transcription ${index + 1}: ${text}`,
            });
          }
        }

        for (const imageUrl of repliedImages) {
          repliedContent.push({
            type: "image_url",
            image_url: { url: imageUrl, detail: "auto" },
          });
        }

        messages.push({
          role: "user",
          content: repliedContent,
        });
      }

      const triggerImages = extractImagesFromMessage(message);
      const triggerAudio = extractAudioFromMessage(message);
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: "You are provided with the following information from the invoking message to help you understand the user's request.",
        },
        {
          type: "text",
          text: `Message author: ${message.author.tag} (ID: ${message.author.id}). Current member nickname: ${message.member.nickname ?? "N/A"}.`,
        },
        {
          type: "text",
          text: "Message content:",
        },
        { type: "text", text: content },
      ];

      const triggerTranscriptions = await Promise.all(
        triggerAudio.map((a) => transcribeAudio(ai, a)),
      );

      for (const [index, text] of triggerTranscriptions.entries()) {
        if (text) {
          userContent.push({
            type: "text",
            text: `Audio Transcription ${index + 1}: ${text}`,
          });
        }
      }

      for (const imageUrl of triggerImages) {
        userContent.push({
          type: "image_url",
          image_url: { url: imageUrl, detail: "auto" },
        });
      }

      messages.push({
        role: "user",
        content: userContent,
      });

      const runner = ai.chat.completions
        .runTools({
          model: "gpt-5.2",
          reasoning_effort: "low",
          messages,
          tools: [
            {
              type: "function",
              function: {
                function: createMute(
                  prisma,
                  messageQueue,
                  moderationLog,
                  message.guild,
                  message.author,
                  (content) => message.reply(content),
                  (content) => message.author.send(content),
                ),
                parse: JSON.parse,
                description: "Mute a user.",
                parameters: {
                  type: "object",
                  properties: {
                    userId: snowflake,
                    duration: { type: "string", pattern: "^(\\d+)([hmsd])$" },
                    reason: { type: "string" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                function: createGetLatestMutes(prisma, message.guild.id),
                description: "Get the latest 5 mutes for the user.",
                parse: JSON.parse,
                parameters: {
                  type: "object",
                  properties: {
                    userId: snowflake,
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                function: createGetLatestWarns(prisma, message.guild.id),
                description: "Get the latest warns for the user.",
                parse: JSON.parse,
                parameters: {
                  type: "object",
                  properties: {
                    userId: snowflake,
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                function: createFetchMessage(message.guild),
                description: "Fetch a message by its ID and channel ID.",
                parse: JSON.parse,
                parameters: {
                  type: "object",
                  properties: {
                    channelId: snowflake,
                    messageId: snowflake,
                  },
                },
              },
            },
            ...(await readInterpreterFunction(message.member, {
              prisma,
              guild: message.guild,
              invokedBy: message.member,
              channel: message.channel,
            })),
          ],
        })
        .on("message", async (message) => {
          if (typeof message.content === "string" && message.role !== "tool") {
            const content = `${message.role === "system" ? "Biszkopt" : message.role}: ${message.content}`;
            await safeSendLongMessage(thread.send.bind(thread), content);
          }
        });

      await message.channel.sendTyping();
      const response = await runner.finalContent();
      await message.reply(response ?? "I'm sorry, I don't understand that.");
    },
  );
