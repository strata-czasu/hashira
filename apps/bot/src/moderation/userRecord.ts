import { Hashira } from "@hashira/core";
import {
  EmbedBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  italic,
  time,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { formatMuteLength } from "./util";
import { formatVerificationType } from "./verification";

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
            name: "Data założenia konta",
            value: `${time(user.createdAt, TimestampStyles.ShortDateTime)} (${time(user.createdAt, TimestampStyles.RelativeTime)})`,
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
          name: "Poziom weryfikacji",
          value: verificationStatusParts.join(" "),
        });

        if (member) {
          const mutes = await prisma.mute.findMany({
            where: {
              guildId: itx.guild.id,
              userId: member.id,
            },
            orderBy: { createdAt: "desc" },
            take: 3,
          });
          if (mutes.length > 0) {
            embed.addFields({
              name: "Ostatnie wyciszenia",
              value: mutes
                .map(
                  (m) =>
                    `${time(m.createdAt, TimestampStyles.ShortDateTime)}+${formatMuteLength(m)} ${italic(m.reason)}`,
                )
                .join("\n"),
            });
          }
          const warns = await prisma.warn.findMany({
            where: {
              guildId: itx.guild.id,
              userId: member.id,
            },
            orderBy: { createdAt: "desc" },
            take: 3,
          });
          if (warns.length > 0) {
            embed.addFields({
              name: "Ostatnie ostrzeżenia",
              value: warns
                .map(
                  (w) =>
                    `${time(w.createdAt, TimestampStyles.ShortDateTime)} ${italic(w.reason)}`,
                )
                .join("\n"),
            });
          }
        }

        if (member?.joinedAt) {
          embed.addFields({
            name: "Data dołączenia na serwer",
            value: `${time(member.joinedAt, TimestampStyles.ShortDateTime)} (${time(member.joinedAt, TimestampStyles.RelativeTime)})`,
          });
        }

        await itx.editReply({ embeds: [embed] });
      }),
  );
