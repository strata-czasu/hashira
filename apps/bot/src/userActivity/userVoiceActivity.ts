// @ts-nocheck

import { Hashira } from "@hashira/core";
import { type Prisma, closeStaleSessions } from "@hashira/db";
import type { VoiceBasedChannel } from "discord.js";
import { base } from "../base";

const TRACKING_INTERVAL = 1000 * 5;

async function collectUserVoiceData(channel: VoiceBasedChannel) {
  await Promise.all(channel.members.map((member) => member.voice.fetch()));

  return channel.members.map(
    (member): Prisma.UserVoiceActivityCreateWithoutChannelVoiceActivityInput => ({
      user: {
        connectOrCreate: {
          create: { id: member.id },
          where: { id: member.id },
        },
      },
      isDeafened: member.voice.deaf ?? false,
      isMuted: member.voice.mute ?? false,
      isStreaming: member.voice.streaming ?? false,
      isVideo: member.voice.selfVideo ?? false,
    }),
  );
}

export const userVoiceActivity = new Hashira({ name: "user-voice-activity" })
  .use(base)
  .handle("ready", async ({ prisma }, client) => {
    await closeStaleSessions();
  })
  .handle("voiceStateUpdate", async ({ prisma }, oldState, newState) => {
    if (!oldState.channel && newState.channel) {
      await prisma.voice;
    }
    if (oldState.channel && !newState.channel) {
    }
  });

//   setInterval(async () => {
//     console.log("Tracking voice activity");
//     const promises: PrismaPromise<unknown>[] = [];
//     for (const [guildId, guild] of client.guilds.cache) {
//       for (const [channelId, channel] of guild.channels.cache) {
//         if (!channel.isVoiceBased()) continue;

//         const users = await collectUserVoiceData(channel, prisma);
//         promises.push(
//           prisma.channelVoiceActivity.create({
//             data: {
//               channelId: channel.id,
//               guildId: channel.guild.id,
//               users: { create: users },
//               period: TRACKING_INTERVAL,
//               timestamp: new Date(),
//             },
//           }),
//         );

//         console.log(`Channel: ${channel.name}, Date: ${new Date()}`);
//         console.log(
//           channel.members
//             .map(
//               (u) =>
//                 `${u.displayName}\n\tDeafened: ${u.voice.deaf}\n\tMuted: ${u.voice.mute}\n\tStreaming: ${u.voice.streaming}\n\tVideo: ${u.voice.selfVideo}`,
//             )
//             .join("\n"),
//         );
//       }
//     }

//     await prisma.$transaction(promises);
//   }, TRACKING_INTERVAL);
// });
