import { Hashira } from "@hashira/core";
import * as cheerio from "cheerio";
import { differenceInDays, sub } from "date-fns";
import {
  DiscordAPIError,
  EmbedBuilder,
  RESTJSONErrorCodes,
  TimestampStyles,
  subtext,
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

async function fetchAsBuffer(url: string | URL) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from ${url}`);
  }
  if (res.headers.get("content-type") !== "image/png") {
    throw new Error(`Invalid content type: ${res.headers.get("content-type")}`);
  }
  const arrbuf = await res.arrayBuffer();
  return Buffer.from(arrbuf);
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
        await itx.deferReply();

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
        // TODO)) Customizable background image
        image
          .tintColor("#aa85a4")
          .nickname(user.displayName)
          .title(user.tag)
          .balance(wallet.balance)
          .rep(0) // TODO)) Rep value
          .items(dbUser.inventoryItems.length)
          .voiceActivity(123) // TODO)) Voice activity value
          .textActivity(textActivity)
          .accountCreationDate(user.createdAt)
          .exp(1234, 23001) // TODO)) Exp value
          .level(0); // TODO)) Level value

        const member = await discordTry(
          () => itx.guild.members.fetch(user.id),
          [RESTJSONErrorCodes.UnknownMember],
          () => null,
        );
        if (member?.joinedAt) {
          image.guildJoinDate(member.joinedAt);
        }

        // TODO)) Customizable badges
        image.allShowcaseBadgesOpacity(0);

        const avatarImageURL =
          user.avatarURL({ extension: "png", size: 256, forceStatic: true }) ??
          user.defaultAvatarURL;
        image.avatarImage(await fetchAsBuffer(avatarImageURL));

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
          const spouseAvatarImageURL =
            spouse.avatarURL({ extension: "png", size: 256, forceStatic: true }) ??
            spouse.defaultAvatarURL;
          image
            .marriageStatusOpacity(1)
            .marriageStatusDays(marriedDays)
            .marriageStatusUsername(spouse.tag)
            .marriageAvatarOpacity(1)
            .marriageAvatarImage(await fetchAsBuffer(spouseAvatarImageURL));
        } else {
          image.marriageStatusOpacity(0).marriageAvatarOpacity(0);
        }

        try {
          const attachment = await image.toSharp().png().toBuffer();
          await itx.editReply({
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
          await itx.editReply({
            content: subtext(
              "Coś poszło nie tak przy generowaniu graficznego profilu! Spróbuj jeszcze raz lub zgłoś problem developerom.",
            ),
            embeds: [embed],
          });
        }
      }),
  );
