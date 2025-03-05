import { Hashira } from "@hashira/core";
import { EmbedBuilder, TimestampStyles, time, userMention } from "discord.js";
import sharp from "sharp";
import { base } from "../base";
import { getDefaultWallet } from "../economy/managers/walletManager";
import { formatBalance } from "../economy/util";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
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

        const wallet = await getDefaultWallet({
          prisma,
          userId: user.id,
          guildId: itx.guildId,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
        });
        const formattedBalance = formatBalance(
          wallet.balance,
          STRATA_CZASU_CURRENCY.symbol,
        );

        const embed = new EmbedBuilder()
          .setTitle(`Profil ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            {
              name: "Stan konta",
              value: formattedBalance,
              inline: true,
            },
            {
              name: "Data utworzenia konta",
              value: time(user.createdAt, TimestampStyles.LongDate),
              inline: true,
            },
          )
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

        const image = await sharp(`${__dirname}/profile.svg`).png().toBuffer();

        await itx.reply({
          files: [{ name: `profil-${user.tag}.png`, attachment: image }],
        });
      }),
  );
