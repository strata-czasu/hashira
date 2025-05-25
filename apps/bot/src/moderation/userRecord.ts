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
        const isInGuild = member !== null;

        const embed = new EmbedBuilder()
          .setTitle(`Kartoteka ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `ID: ${user.id}` })
          .addFields(
            {
              name: "Data założenia konta",
              value: time(user.createdAt, TimestampStyles.ShortDateTime),
            },
            {
              name: "Poziom weryfikacji",
              value: formatVerificationType(dbUser.verificationLevel),
            },
            {
              name: "Na serwerze?",
              value: isInGuild ? "Tak" : "Nie",
            },
          );

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
