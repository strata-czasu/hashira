import { Hashira } from "@hashira/core";
import * as cheerio from "cheerio";
import { differenceInDays, format, sub } from "date-fns";
import {
  DiscordAPIError,
  EmbedBuilder,
  RESTJSONErrorCodes,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { getDefaultWallet } from "../economy/managers/walletManager";
import { formatBalance } from "../economy/util";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { ProfileImageBuilder } from "./imageBuilder";
import { marriage } from "./marriage";

async function fetchAsBase64(url: string | URL) {
  const res = await fetch(url);
  const arrbuf = await res.arrayBuffer();
  return Buffer.from(arrbuf).toString("base64");
}

async function loadFileAsBase64(path: string) {
  const file = Bun.file(path);
  const arrbuf = await file.arrayBuffer();
  return Buffer.from(arrbuf).toString("base64");
}

function formatPNGDataURL(data: string) {
  return `data:image/png;base64,${data}`;
}

const PROFILE_DATE_FORMAT = "dd.MM.yyyy" as const;

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
          include: {
            inventoryItems: true,
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
        const textActivity = await prisma.userTextActivity.count({
          where: {
            userId: user.id,
            guildId: itx.guildId,
            timestamp: {
              gte: sub(itx.createdAt, { days: 30 }),
            },
          },
        });

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

        const file = Bun.file(`${__dirname}/res/profile.svg`);
        const svg = cheerio.load(await file.text());
        const image = new ProfileImageBuilder(svg);
        const backgroundImage = await loadFileAsBase64(
          `${__dirname}/res/background/summit.png`,
        );
        image
          .tintColor("#aa85a4")
          .nickname(user.displayName)
          .title(user.tag)
          .balance(formatBalanceForSVG(wallet.balance))
          .rep("0 rep") // TODO)) Rep value
          .items(dbUser.inventoryItems.length.toString())
          .voiceActivity(123) // TODO)) Voice activity value
          .textActivity(textActivity)
          .accountCreationDate(format(user.createdAt, PROFILE_DATE_FORMAT))
          .exp("1234/23001") // TODO)) Exp value
          .level(42) // TODO)) Level value
          .backgroundImage(formatPNGDataURL(backgroundImage)); // TODO)) Customizable background image

        const member = await discordTry(
          () => itx.guild.members.fetch(user.id),
          [RESTJSONErrorCodes.UnknownMember],
          () => null,
        );
        if (member?.joinedAt) {
          image.guildJoinDate(format(member.joinedAt, PROFILE_DATE_FORMAT));
        }

        // TODO)) Customizable badges
        const smirkIcon = await loadFileAsBase64(`${__dirname}/res/badge/smirk.png`);
        const smirkBigIcon = await loadFileAsBase64(
          `${__dirname}/res/badge/smirk-big.png`,
        );
        image
          .allShowcaseBadgesOpacity(0)
          .showcaseBadge(1, 1, formatPNGDataURL(smirkIcon))
          .showcaseBadge(2, 4, formatPNGDataURL(smirkIcon))
          .showcaseBadge(2, 5, formatPNGDataURL(smirkBigIcon))
          .showcaseBadge(3, 4, formatPNGDataURL(smirkBigIcon));

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

          const marriedDays = differenceInDays(itx.createdAt, dbUser.marriedAt);
          const avatarImageURL =
            spouse.avatarURL({ extension: "png", size: 256, forceStatic: true }) ??
            spouse.defaultAvatarURL;
          const encodedData = await fetchAsBase64(avatarImageURL);
          image
            .marriageStatusTextDays(marriedDays)
            .marriageStatusTextUsername(spouse.tag)
            .marriageImage(formatPNGDataURL(encodedData))
            .marriageOpacity(1);
        } else {
          image
            .marriageStatusIconFill("gray")
            .marriageStatusTextOpacity(0)
            .marriageOpacity(0);
        }

        try {
          const attachment = await image.toSharp().png().toBuffer();
          await itx.reply({
            files: [{ name: `profil-${user.tag}.png`, attachment }],
          });
        } catch (e) {
          if (!(e instanceof DiscordAPIError)) {
            console.error(
              `Failed to generate user profile image for user ${user.tag}`,
              e,
            );
          } else {
            console.error(
              `Failed to generate user profile image for user ${user.tag}: ${e.code} - ${e.message}`,
            );
          }
          await itx.reply({ embeds: [embed] });
        }
      }),
  );
