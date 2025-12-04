import { Hashira } from "@hashira/core";
import { secondsToHours, sub } from "date-fns";
import {
  EmbedBuilder,
  italic,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  strikethrough,
  TimestampStyles,
  time,
} from "discord.js";
import { base } from "../base";
import { getUserTextActivity, getUserVoiceActivity } from "../userActivity/util";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { formatMuteLength } from "./util";
import { formatVerificationType } from "./verification";

const forceNewline = (text: string) => `${text}\n\u{200e}`;

const formatActivities = (voiceActivitySeconds: number, textActivity: number) => {
  const parts = [
    `🎙️ ${secondsToHours(voiceActivitySeconds)}h`,
    `🗨️ ${textActivity} wiad.`,
  ];
  return parts.join(" | ");
};

export const userRecord = new Hashira({ name: "user-record" })
  .use(base)
  .command("kartoteka", (command) =>
    command
      .setDescription("Sprawdź kartotekę użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ prisma }, { user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUserExists(prisma, user);
        const dbUser = await prisma.user.findFirst({ where: { id: user.id } });
        if (!dbUser) return;

        const member = await discordTry(
          async () => itx.guild.members.fetch(user.id),
          [RESTJSONErrorCodes.UnknownMember],
          () => null,
        );

        const embed = new EmbedBuilder()
          .setTitle(`Kartoteka ${user.tag}`)
          .setFooter({
            text: user.id,
            iconURL: user.displayAvatarURL(),
          })
          .addFields({
            name: "📆 Data założenia konta",
            value: forceNewline(
              `${time(user.createdAt, TimestampStyles.ShortDateTime)} (${time(user.createdAt, TimestampStyles.RelativeTime)})`,
            ),
          });

        const verificationStatusParts = [
          formatVerificationType(dbUser.verificationLevel),
        ];
        const verification = await prisma.verification.findFirst({
          where: {
            guildId: itx.guild.id,
            userId: user.id,
            acceptedAt: { not: null },
          },
          orderBy: { acceptedAt: "desc" },
        });
        if (verification?.acceptedAt) {
          verificationStatusParts.push(
            `(przyjęto ${time(verification.acceptedAt, TimestampStyles.ShortDateTime)})`,
          );
        }
        embed.addFields({
          name: "🔞 Poziom weryfikacji",
          value: forceNewline(verificationStatusParts.join(" ")),
        });

        if (member) {
          const mutes = await prisma.mute.findMany({
            where: {
              deletedAt: null,
              guildId: itx.guild.id,
              userId: member.id,
            },
            orderBy: { createdAt: "desc" },
            take: 3,
          });
          if (mutes.length > 0) {
            const joinedMutes = mutes
              .map(
                (m) =>
                  `${time(m.createdAt, TimestampStyles.ShortDateTime)}+${formatMuteLength(m)} ${italic(m.reason)}`,
              )
              .join("\n");
            embed.addFields({
              name: "🔇 Ostatnie wyciszenia",
              value: forceNewline(joinedMutes),
            });
          }

          const warns = await prisma.warn.findMany({
            where: {
              deletedAt: null,
              guildId: itx.guild.id,
              userId: member.id,
            },
            orderBy: { createdAt: "desc" },
            take: 3,
          });
          if (warns.length > 0) {
            const joinedWarns = warns
              .map(
                (w) =>
                  `${time(w.createdAt, TimestampStyles.ShortDateTime)} ${italic(w.reason)}`,
              )
              .join("\n");
            embed.addFields({
              name: "⚠️ Ostatnie ostrzeżenia",
              value: forceNewline(joinedWarns),
            });
          }

          const channelRestrictions = await prisma.channelRestriction.findMany({
            where: {
              guildId: itx.guild.id,
              userId: member.id,
            },
            orderBy: { createdAt: "desc" },
            take: 3,
          });
          if (channelRestrictions.length > 0) {
            const joinedRestrictions = channelRestrictions
              .map((cr) => {
                const line = `${time(cr.createdAt, TimestampStyles.ShortDateTime)} ${italic(cr.reason)}`;
                return cr.deletedAt ? strikethrough(line) : line;
              })
              .join("\n");
            embed.addFields({
              name: "🚫 Ostatnio odebrane dostępy",
              value: forceNewline(joinedRestrictions),
            });
          }

          const activitySince = sub(itx.createdAt, { days: 30 });
          const textActivity30Days = await getUserTextActivity({
            prisma,
            guildId: itx.guildId,
            userId: user.id,
            since: activitySince,
          });
          const voiceActivitySeconds30Days = await getUserVoiceActivity({
            prisma,
            guildId: itx.guildId,
            userId: user.id,
            since: activitySince,
          });

          const textActivityAllTime = await getUserTextActivity({
            prisma,
            guildId: itx.guildId,
            userId: user.id,
          });
          const voiceActivitySecondsAllTime = await getUserVoiceActivity({
            prisma,
            guildId: itx.guildId,
            userId: user.id,
          });

          const activityLines = [
            `${formatActivities(voiceActivitySeconds30Days, textActivity30Days)} (30 dni)`,
            `${formatActivities(voiceActivitySecondsAllTime, textActivityAllTime)} (od początku)`,
          ];
          embed.addFields({
            name: "Aktywność",
            value: forceNewline(activityLines.join("\n")),
          });
        }

        if (member?.joinedAt) {
          embed.addFields({
            name: "📆 Data dołączenia na serwer",
            value: `${time(member.joinedAt, TimestampStyles.ShortDateTime)} (${time(member.joinedAt, TimestampStyles.RelativeTime)})`,
          });
        }

        await itx.editReply({ embeds: [embed] });
      }),
  );
