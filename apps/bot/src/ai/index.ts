import { type ExtractContext, Hashira } from "@hashira/core";
import env from "@hashira/env";
import { format } from "date-fns";
import { userMention } from "discord.js";
import { type ChatMessage, type ChatResponse, OpenAIClient } from "openai-fetch";
import * as v from "valibot";
import { base } from "../base";
import { STATIC_PROMPT } from "./prompt";
import forward from "./tools/forward";
import getLatestMutes from "./tools/getLatestMutes";
import mute from "./tools/mute";
import readMessage from "./tools/readMessage";
import { getDefinition } from "./tools/util/getDefinition";
import type { Tool } from "./tools/util/tool";
import type { ToolContext } from "./tools/util/toolContext";

const createAi = () => {
  if (!env.OPENAI_KEY) return null;

  return new OpenAIClient({
    apiKey: env.OPENAI_KEY,
    baseUrl: env.OPENAI_URL ?? "https://api.openai.com/v1",
  });
};

const tools: Tool[] = [getLatestMutes, mute, readMessage, forward] as unknown as Tool[];
const toolDefinitions = tools.map(getDefinition);

type ToolCalls = ChatResponse["choices"][number]["message"]["tool_calls"];

const processToolCall = async (
  toolCall: NonNullable<ToolCalls>[number],
  ctx: ExtractContext<typeof base>,
  toolCtx: ToolContext,
) => {
  const tool = tools.find((t) => t.name === toolCall.function.name);

  if (!tool) return { id: toolCall.id, data: "Tool not found" };

  const toolFunction = tool.creator(ctx, toolCtx);
  const data = JSON.parse(toolCall.function.arguments);
  const validation = v.safeParse(tool.schema, data);

  return {
    id: toolCall.id,
    data: validation.success ? await toolFunction(validation.output) : validation,
  };
};

console.dir(toolDefinitions, { depth: null });

const processFunctionToolCalls = (
  toolCalls: NonNullable<ToolCalls>,
  ctx: ExtractContext<typeof base>,
  toolCtx: ToolContext,
) => {
  return Promise.all(
    toolCalls
      .filter((tc) => tc.type === "function")
      .map((tc) => processToolCall(tc, ctx, toolCtx)),
  );
};

export const ai = new Hashira({ name: "ai" })
  .use(base)
  .const("ai", createAi())
  .handle("messageCreate", async (ctx, message) => {
    const { ai } = ctx;
    if (!ai) return;
    if (message.author.bot) return;
    if (!message.inGuild()) return;
    if (!message.member) return;
    if (!message.member.permissions.has("ModerateMembers")) return;
    const botMention = userMention(message.client.user.id);
    if (!message.content.startsWith(botMention)) return;
    const content = message.content.slice(botMention.length).trim();
    if (!content) return;

    if (message.channel.isThread()) {
      await message.reply("Can't share my wisdom in threads yet.");
      return;
    }

    const prompt = [
      STATIC_PROMPT,
      `Current time: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    ];

    await message.channel.sendTyping();

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: prompt.join("\n"),
      },
      {
        role: "user",
        content,
      },
    ];
    const thread = await message.startThread({ name: "Biszkopciki" });

    let response = await ai.createChatCompletion({
      model: "gpt-4o",
      messages,
      tools: toolDefinitions,
    });

    while (response.choices[0]?.message) {
      const chatMessage = response.choices[0].message;
      const toolCalls = chatMessage.tool_calls ?? [];

      messages.push({
        role: "assistant",
        content: chatMessage.content,
        tool_calls: toolCalls ?? [],
      });

      const discordContent = [
        chatMessage.content,
        toolCalls.length
          ? `Tools: ${toolCalls.map((tc) => tc.function.name).join(", ")}`
          : "",
      ];

      await thread.send(discordContent.join("\n"));

      if (!toolCalls.length) break;

      const toolCallResults = await processFunctionToolCalls(toolCalls, ctx, {
        guild: message.guild,
        invokedBy: message.author,
        reply: (content: string) => message.reply(content),
      });

      for (const toolCallResult of toolCallResults) {
        messages.push({
          role: "tool",
          content: JSON.stringify(toolCallResult.data),
          tool_call_id: toolCallResult.id,
        });
      }

      response = await ai.createChatCompletion({
        model: "chatgpt-4o-latest",
        messages: messages,
        tools: toolDefinitions,
      });
    }

    console.dir(messages, { depth: null });
  });
