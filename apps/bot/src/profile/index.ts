import { Hashira } from "@hashira/core";
import * as cheerio from "cheerio";
import { EmbedBuilder, TimestampStyles, time, userMention } from "discord.js";
import { base } from "../base";
import { getDefaultWallet } from "../economy/managers/walletManager";
import { formatBalance } from "../economy/util";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { ProfileImageBuilder } from "./imageBuilder";
import { marriage } from "./marriage";

async function fetchAsBase64(url: string | URL) {
  const res = await fetch(url);
  const arrbuf = await res.arrayBuffer();
  return Buffer.from(arrbuf).toString("base64");
}

function formatPNGDataURL(data: string) {
  return `data:image/png;base64,${data}`;
}

/**
 * Formats balance as a locale string with a space instead of a non-breaking space.
 * &nbsp; doesn't seem to work in SVG <tspan> elements, so we're using a regular space.
 */
function formatBalanceForSVG(balance: number) {
  const nbspRe = new RegExp(String.fromCharCode(160), "g");
  return balance.toLocaleString("pl-PL").replace(nbspRe, " ");
}

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

        const file = Bun.file(`${__dirname}/profile.svg`);
        const svg = cheerio.load(await file.text());
        const image = new ProfileImageBuilder(svg);
        image
          .nickname(user.displayName)
          .title(user.tag)
          .balance(formatBalanceForSVG(wallet.balance));

        // Tests
        image
          .allShowcaseBadgesOpacity(0)
          .showcaseBadgeOpacity(1, 1, 1)
          .showcaseBadgeOpacity(1, 2, 1)
          .showcaseBadgeOpacity(2, 4, 1)
          .showcaseBadgeOpacity(3, 5, 1);

        const avatarImageURL =
          user.avatarURL({ extension: "png", size: 256, forceStatic: true }) ??
          user.defaultAvatarURL;
        const encodedData = await fetchAsBase64(avatarImageURL);
        image.avatarImage(formatPNGDataURL(encodedData));

        if (dbUser.marriedTo && dbUser.marriedAt) {
          const spouse = await itx.client.users.fetch(dbUser.marriedTo);
          embed.addFields({
            name: "Małżeństwo :heart:",
            value: `Z ${userMention(spouse.id)} od ${time(
              dbUser.marriedAt,
              TimestampStyles.LongDate,
            )}`,
          });

          const avatarImageURL =
            spouse.avatarURL({ extension: "png", size: 256, forceStatic: true }) ??
            spouse.defaultAvatarURL;
          const encodedData = await fetchAsBase64(avatarImageURL);
          image.marriageImage(formatPNGDataURL(encodedData)).marriageOpacity(1);
        } else {
          image.marriageOpacity(0);
        }

        const attachment = await image.toSharp().png().toBuffer();
        await itx.reply({
          // embeds: [embed],
          files: [{ name: `profil-${user.tag}.png`, attachment }],
        });
      }),
  );
