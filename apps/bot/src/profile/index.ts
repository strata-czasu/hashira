import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import * as cheerio from "cheerio";
import { differenceInDays, sub } from "date-fns";
import {
  DiscordAPIError,
  EmbedBuilder,
  RESTJSONErrorCodes,
  TimestampStyles,
  inlineCode,
  italic,
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
  .group("profil", (group) =>
    group
      .setDescription("Profil")
      .setDMPermission(false)
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl profil użytkownika")
          .addUser("user", (user) =>
            user.setDescription("Użytkownik").setRequired(false),
          )
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
                profileSettings: {
                  include: {
                    title: true,
                  },
                },
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
            image
              .tintColor("#aa85a4")
              .nickname(user.displayName)
              .balance(wallet.balance)
              .rep(0) // TODO)) Rep value
              .items(dbUser.inventoryItems.length)
              .voiceActivity(123) // TODO)) Voice activity value
              .textActivity(textActivity)
              .accountCreationDate(user.createdAt)
              .exp(1234, 23001) // TODO)) Exp value
              .level(42); // TODO)) Level value

            // TODO)) Customizable background image

            if (dbUser.profileSettings?.title) {
              image.title(dbUser.profileSettings.title.name);
            } else {
              image.title("Użytkownik");
            }

            const member = await discordTry(
              () => itx.guild.members.fetch(user.id),
              [RESTJSONErrorCodes.UnknownMember],
              () => null,
            );
            if (member?.joinedAt) {
              image.guildJoinDate(member.joinedAt);
            }

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

            image.allShowcaseBadgesOpacity(0);
            const displayedBadges = await prisma.displayedProfileBadge.findMany({
              where: { userId: user.id },
              include: { badge: true },
            });
            for (const { row, col, badge } of displayedBadges) {
              image.showcaseBadge(row, col, Buffer.from(badge.image));
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
      )
      .addGroup("tytuł", (group) =>
        group
          .setDescription("Tytuły profilu")
          .addCommand("lista", (command) =>
            command
              .setDescription("Wyświetl swoje tytuły")
              .handle(async ({ prisma }, _, itx) => {
                if (!itx.inCachedGuild()) return;

                const where: Prisma.InventoryItemWhereInput = {
                  item: { type: "profileTitle" },
                  userId: itx.user.id,
                  deletedAt: null,
                };
                const paginator = new DatabasePaginator(
                  (props) =>
                    prisma.inventoryItem.findMany({
                      where,
                      include: { item: true },
                      ...props,
                    }),
                  () => prisma.inventoryItem.count({ where }),
                );

                const paginatedView = new PaginatedView(
                  paginator,
                  "Posiadane tytuły",
                  ({ item: { name, id }, createdAt }) =>
                    `- ${name} (${time(createdAt, TimestampStyles.ShortDate)}) [${inlineCode(id.toString())}]`,
                  false,
                );
                await paginatedView.render(itx);
              }),
          )
          .addCommand("ustaw", (command) =>
            command
              .setDescription("Ustaw wyświetlany tytuł profilu")
              .addInteger("id", (command) => command.setDescription("ID tytułu"))
              .handle(async ({ prisma }, { id }, itx) => {
                if (!itx.inCachedGuild()) return;
                await itx.deferReply();

                const ownedTitle = await prisma.inventoryItem.findFirst({
                  where: {
                    item: { id, type: "profileTitle" },
                    userId: itx.user.id,
                    deletedAt: null,
                  },
                  include: { item: true },
                });
                if (!ownedTitle) {
                  await itx.editReply(
                    "Tytuł o tym ID nie istnieje lub go nie posiadasz!",
                  );
                  return;
                }
                const {
                  item: { id: titleId, name },
                } = ownedTitle;

                await ensureUserExists(prisma, itx.user);
                await prisma.profileSettings.upsert({
                  create: { titleId, userId: itx.user.id },
                  update: { titleId },
                  where: { userId: itx.user.id },
                });

                await itx.editReply(`Ustawiono tytuł ${italic(name)}`);
              }),
          ),
      )
      .addGroup("odznaki", (group) =>
        group
          .setDescription("Odznaki profilu")
          .addCommand("lista", (command) =>
            command
              .setDescription("Wyświetl swoje odznaki")
              .handle(async ({ prisma }, _, itx) => {
                if (!itx.inCachedGuild()) return;

                const where: Prisma.InventoryItemWhereInput = {
                  item: { type: "badge" },
                  userId: itx.user.id,
                  deletedAt: null,
                };
                const paginator = new DatabasePaginator(
                  (props) =>
                    prisma.inventoryItem.findMany({
                      where,
                      include: { item: true },
                      ...props,
                    }),
                  () => prisma.inventoryItem.count({ where }),
                );

                const paginatedView = new PaginatedView(
                  paginator,
                  "Posiadane odznaki",
                  ({ item: { name, id }, createdAt }) =>
                    `- ${name} (${time(createdAt, TimestampStyles.ShortDate)}) [${inlineCode(id.toString())}]`,
                  false,
                );
                await paginatedView.render(itx);
              }),
          )
          .addCommand("ustaw", (command) =>
            command
              .setDescription("Wyświetl odznakę na profilu")
              .addInteger("id", (id) => id.setDescription("ID odznaki"))
              .addInteger("wiersz", (row) =>
                row.setDescription("Numer wiersza (1-3)").setMinValue(1).setMaxValue(3),
              )
              .addInteger("kolumna", (column) =>
                column
                  .setDescription("Numer kolumny (1-5)")
                  .setMinValue(1)
                  .setMaxValue(5),
              )
              .handle(async ({ prisma }, { id, wiersz: row, kolumna: col }, itx) => {
                if (!itx.inCachedGuild()) return;
                await itx.deferReply();

                const ownedBadge = await prisma.inventoryItem.findFirst({
                  where: {
                    item: { id, type: "badge" },
                    userId: itx.user.id,
                    deletedAt: null,
                  },
                  include: {
                    item: {
                      include: { badge: true },
                    },
                  },
                });
                if (!ownedBadge?.item.badge) {
                  await itx.editReply(
                    "Odznaka o tym ID nie istnieje lub jej nie posiadasz!",
                  );
                  return;
                }

                const {
                  item: {
                    name,
                    badge: { id: badgeId },
                  },
                } = ownedBadge;

                await ensureUserExists(prisma, itx.user);
                await prisma.$transaction(async (tx) => {
                  // Remove placement on the same row and column we're trying to place a new badge
                  await tx.displayedProfileBadge.deleteMany({
                    where: { userId: itx.user.id, row, col },
                  });
                  // Update badge on an existing placement
                  await tx.displayedProfileBadge.upsert({
                    create: { userId: itx.user.id, badgeId, row, col },
                    update: { badgeId, row, col },
                    where: {
                      userId_badgeId: { userId: itx.user.id, badgeId },
                    },
                  });
                });

                await itx.editReply(
                  `Ustawiono odznakę ${italic(name)} na pozycji ${row}:${col}`,
                );
              }),
          )
          .addCommand("usuń", (command) =>
            command
              .setDescription("Usuń odznakę z profilu")
              .addInteger("wiersz", (row) =>
                row.setDescription("Numer wiersza (1-3)").setMinValue(1).setMaxValue(3),
              )
              .addInteger("kolumna", (column) =>
                column
                  .setDescription("Numer kolumny (1-5)")
                  .setMinValue(1)
                  .setMaxValue(5),
              )
              .handle(async ({ prisma }, { wiersz: row, kolumna: col }, itx) => {
                if (!itx.inCachedGuild()) return;
                await itx.deferReply();

                await ensureUserExists(prisma, itx.user);
                const { count } = await prisma.displayedProfileBadge.deleteMany({
                  where: { userId: itx.user.id, row, col },
                });

                if (count === 0) {
                  await itx.editReply("Nie masz odznaki na tej pozycji!");
                  return;
                }
                await itx.editReply(`Usunięto odznakę z pozycji ${row}:${col}`);
              }),
          ),
      ),
  );
