import { type ExtractContext, Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import env from "@hashira/env";
import { format, intervalToDuration, isAfter } from "date-fns";
import { type Guild, type User, userMention } from "discord.js";
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
Text Voice 22. Using multiple accounts without Support Team's consent.

## Other
Text Voice 23. Situations not covered by the tariff may be resolved by the Support Team through internal discussions or voting in specific situations on the server.
Text 24. Violating the internal rules of thematic channels found in their descriptions.

# Recydywa
The "Recydywa" system is designed to handle repeated rule violations with increasing penalties. Here's a simplified breakdown of how it works:

## Basic Rules:

1. **Increasing Penalties:** Each time someone breaks the rules, the penalty gets worse. If you get muted multiple times, each mute will be longer than the last.

2. **Reset Period:** If you go 10 days without getting muted, the system resets back to the first level. This 10-day countdown starts from the end of your last mute.

3. **Exclusions:** Mutes from special cases, like roulettes, don’t count in this system.

## Penalty Levels:

- **Level 1:** The first mute starts the process. If your first offense gets a 3-hour mute, that’s Level 1. If it's a 24-hour mute, that's still Level 1, but the duration will be based on that first offense.

- **Level 2:** The next time you break the rules, the mute will be longer. For example:
  - If Level 1 was a 3-hour mute, Level 2 is 8 hours.
  - If Level 1 was a 24-hour mute, Level 2 is 2 days.

- **Level 3 to Level 5:** Each new offense adds one more day to the mute. Continuing the above examples:
  - 1-day mute becomes 2 days, then 3, then 4, and so on.
  - After Level 5 (e.g., 5 days), a ban is applied.

## Resetting Example:

- If you get muted for 8 hours and then stay clean for 10 days, the system resets.
- If you then get a 3-hour mute, you start again at Level 1 with that 3-hour duration, and subsequent mutes will follow the Level progression from there.

## Key Points:

- **Resets:** Go 10 days without any mute, and your record resets to Level 1.
- **Starting Point:** Always starts at Level 1, regardless of how long the first mute is.
- **Penalty Increases:** Once you hit a 1-day mute, each subsequent penalty adds an extra day until Level 5, then a ban happens.
`;
}

const createMute = (
  prisma: ExtendedPrismaClient,
  messageQueue: ExtractContext<typeof base>["messageQueue"],
  log: ExtractContext<typeof base>["moderationLog"],
  guild: Guild,
  moderator: User,
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
      log,
      userId,
      guild,
      moderator,
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
  .handle(
    "messageCreate",
    async ({ ai, prisma, messageQueue, moderationLog }, message) => {
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
        "If you're not provided with a duration, you should follow the server rules.",
        "You cannot interact with the moderator, only provide them with information and perform actions.",
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
                moderationLog,
                message.guild,
                message.author,
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
    },
  );
