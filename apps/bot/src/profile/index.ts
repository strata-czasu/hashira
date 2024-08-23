import { Hashira } from "@hashira/core";
import { EmbedBuilder, TimestampStyles, time, userMention } from "discord.js";
import { base } from "../base";
import { ensureUserExists } from "../util/ensureUsersExist";
import { marriage } from "./marriage";

export const profile = new Hashira({ name: "profile" })
  .use(base)
  .use(marriage)
  .command("profil", (command) =>
    command
      .setDescription("Wyświetl profil")
      .setDMPermission(false)
      .addUser("user", (user) => user.setDescription("Użytkownik").setRequired(false))
      .handle(async ({ prisma }, { user: rawUser }, itx) => {
        if (!itx.inCachedGuild()) return;

        const user = rawUser ?? itx.user;
        await ensureUserExists(prisma, user.id);

        const dbUser = await prisma.user.findFirst({
          where: {
            id: user.id,
          },
        });

        if (!dbUser) return;

        const embed = new EmbedBuilder()
          .setTitle(`Profil ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields({
            name: "Data utworzenia konta",
            value: time(user.createdAt, TimestampStyles.ShortDate),
          })
          .setFooter({ text: `ID: ${user.id}` });
        if (dbUser.marriedTo && dbUser.marriedAt) {
          const spouse = await itx.client.users.fetch(dbUser.marriedTo);
          embed.addFields({
            name: "Małżeństwo :heart:",
            value: `Z ${userMention(spouse.id)} od ${time(
              dbUser.marriedAt,
              TimestampStyles.LongDate,
            )}`,
          });
        }
        await itx.reply({ embeds: [embed] });
      }),
  );
