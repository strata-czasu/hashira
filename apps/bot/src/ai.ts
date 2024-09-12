import { type ExtractContext, Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import env from "@hashira/env";
import { format, intervalToDuration, isAfter } from "date-fns";
import { type Guild, userMention } from "discord.js";
import OpenAI from "openai";
import { base } from "./base";
import { universalAddMute } from "./moderation/mutes";
import { formatDuration } from "./util/duration";

function getRules() {
  return `## 3 Hours
Text Voice 1. Mild insults, swearing, or toxic behavior in chat, profile, avatar, or nickname.
Text Voice 2. Provoking, mini-modding, or trolling.
Text 3. Minor flooding, spam, caps lock, or hindering chat usage.
Text 4. Repeatedly pinging the same person.
Text 5. Advertising in the wrong place, sent once.

## 8 Hours
Voice 6. Improper use of microphone or camera.
Text Voice 7. Criminal threats.
Text Voice 8. Prohibited, blasphemous, indecent content, or promoting the use of illegal and harmful substances.
Text Voice 9. Severe insults, swearing, or toxic behavior.
Text 10. Major flooding, spam, caps lock, hindering chat usage, or earrape.
Text Voice 11. Impersonating someone without using their personal data or photos.
Text 12. Sending harmful software (in extreme cases, a ban).
Voice 13. Streaming on other platforms (e.g., Twitch) without the consent of others on VC, recording others on VC without reason, or streaming platforms that contain images of other people (e.g., Tinder, Omegle).
Text Voice 14. Slander.

## 24 Hours
Text Voice 15. Verbal sexual harassment.
Text Voice 16. Mild graphic or pornographic content.
Text Voice 17. Harassment (in extreme cases, a ban).

## Ban
Text 18. Severe graphic or pornographic content.
Text Voice 19. Publishing and/or using personal data of former or current server users without their consent.
Text 20. Unwanted advertisement sent in a private message once or multiple times on the server.
Text Voice 21. Participation in a raid.
Text Voice 22. Using multiple accounts without ST's consent.

## Other
Text Voice 23. Situations not covered by the tariff may be resolved by the Support Team through internal discussions or voting in specific situations on the server.
Text 24. Violating the internal rules of thematic channels found in their descriptions.

# Recydywa
"Recydywa" is a system for punishing repeat rule violations, with increasing penalties for each offense:

- **Duration:** Resets after 10 days without a mute, SINCE the end of the last mute.
- **Exclusions:** Does not include mutes from a roulette.

## Examples:

### **Steps if first offense is 3h mute:**
1. **Start:** 3-hour penalty.
2. **Level 2:** 8-hour penalty.
3. **Level 3:** 1-day penalty.
4. **Level 4:** 2-day penalty.
5. **Level 5:** 3-day penalty.
6. **Ban:** After Level V, a ban is applied.


### **Steps if first offense is 24h mute:**
1. **Start:** 24-hour penalty.
2. **Level 2:** 2-day penalty.
3. **Level 3:** 3-day penalty.
4. **Level 4:** 4-day penalty.
5. **Level 5:** 5-day penalty.
6. **Ban:** After Level V, a ban is applied.

If 10 days have passed since the last mute, the system resets to Level 1. You only account for the last mute unless it's excluded.

Penalty duration increments by 1 day after 24h mutes.
The starting point depends on the first mute's duration, but it's always Level 1. Even if the first mute is 24 hours, the system starts at Level 1.`;
}

const createMute = (
  prisma: ExtendedPrismaClient,
  messageQueue: ExtractContext<typeof base>["messageQueue"],
  guild: Guild,
  moderatorId: string,
  reply: (content: string) => Promise<unknown>,
) => {
  async function mute({
    userId,
    duration,
    reason,
  }: { userId: string; duration: string; reason: string }) {
    await universalAddMute({
      prisma,
      messageQueue,
      userId,
      guild,
      moderatorId,
      duration,
      reason,
      reply,
    });
  }

  return mute;
};

const createGetLatestMutes = (prisma: ExtendedPrismaClient, guildId: string) => {
  return async function getLatestMutes({ userId }: { userId: string }) {
    const mutes = await prisma.mute.findMany({
      where: { guildId, userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const now = new Date();

    return mutes.map((mute) => ({
      id: mute.id,
      mutedBy: mute.moderatorId,
      reason: mute.reason,
      duration: formatDuration(
        intervalToDuration({ start: mute.createdAt, end: mute.endsAt }),
      ),
      ...(isAfter(now, mute.endsAt)
        ? {
            timeSinceEnd: formatDuration(
              intervalToDuration({ start: mute.endsAt, end: now }),
            ),
          }
        : {}),
    }));
  };
};

const createGetLatestWarns = (prisma: ExtendedPrismaClient, guildId: string) => {
  return async function getLatestWarns({ userId }: { userId: string }) {
    const warns = await prisma.warn.findMany({
      where: { guildId, userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return warns.map((warn) => ({
      id: warn.id,
      warnedBy: warn.moderatorId,
      reason: warn.reason,
      timeSince: formatDuration(
        intervalToDuration({ start: warn.createdAt, end: new Date() }),
      ),
    }));
  };
};

const snowflake = {
  type: "string",
  pattern: "^\\d+$",
  description: "A Discord snowflake. Can be parsed from mention like <@id>, <#id>.",
} as const;

export const ai = new Hashira({ name: "ai" })
  .use(base)
  .const("ai", env.OPENAI_KEY ? new OpenAI({ apiKey: env.OPENAI_KEY }) : null)
  .handle("messageCreate", async ({ ai, prisma, messageQueue }, message) => {
    if (!ai) return;
    if (message.author.bot) return;
    if (!message.inGuild()) return;
    if (!message.member) return;
    if (!message.member.permissions.has("ModerateMembers")) return;
    const botMention = userMention(message.client.user.id);
    if (!message.content.startsWith(botMention)) return;
    const content = message.content.slice(botMention.length).trim();
    if (!content) return;

    const prompt = [
      "You are a helpful moderation assistant for a Discord server. Formulate your responses in Polish. Your name is Biszkopt, a male assistant.",
      "Person you're assisting is a moderator, you should follow their instructions if given, even if do not align with the server rules.",
      "If giving mutes without given duration, please follow the server rules.",
      "Don't check warns if you're not instructed to.",
      "If not given snowflake, respond that you need a user to be mentioned or their id.",
      "Always provide your entire reasoning in steps for your actions in your final response like: 1. fetched the latest mutes, 2. fetched the latest warns, 4. calculated next recydywa is level 4, 5. muted the user.",
      `Current time: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    ];

    const runner = ai.beta.chat.completions.runTools({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: prompt.join("\n"),
        },
        {
          role: "user",
          content,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            function: createMute(
              prisma,
              messageQueue,
              message.guild,
              message.author.id,
              (content) => message.reply(content),
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
            function: getRules,
            description: "Get the server rules.",
            parameters: {},
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
      ],
    });

    await message.channel.sendTyping();
    const response = await runner.finalContent();
    await message.reply(response ?? "I'm sorry, I don't understand that.");
  });
