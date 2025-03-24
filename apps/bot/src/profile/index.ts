import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import * as cheerio from "cheerio";
import { differenceInDays, sub } from "date-fns";
import {
  DiscordAPIError,
  EmbedBuilder,
  PermissionFlagsBits,
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
              },
            });
            if (!dbUser) return;
            await itx.deferReply();

            const profileSettings = await prisma.profileSettings.findFirst({
              where: { userId: user.id },
              select: { title: true },
            });
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
            // TODO)) Customizable badges
            image.allShowcaseBadgesOpacity(0);

            if (profileSettings?.title) {
              image.title(profileSettings.title.name);
            } else {
              // TODO)) Should we display something else by default?
              image.title("");
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

                const where = { userId: itx.user.id };
                const paginator = new DatabasePaginator(
                  (props) =>
                    prisma.ownedProfileTitle.findMany({
                      where,
                      select: { createdAt: true, title: true },
                      ...props,
                    }),
                  () => prisma.ownedProfileTitle.count({ where }),
                );

                const paginatedView = new PaginatedView(
                  paginator,
                  "Posiadane tytuły",
                  ({ title: { name, id }, createdAt }) =>
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

                const ownedTitle = await prisma.ownedProfileTitle.findFirst({
                  where: { titleId: id, userId: itx.user.id },
                  select: { title: true },
                });
                if (!ownedTitle) {
                  await itx.editReply(
                    "Tytuł o tym ID nie istnieje lub go nie posiadasz!",
                  );
                  return;
                }
                const { title } = ownedTitle;

                await ensureUserExists(prisma, itx.user);
                await prisma.profileSettings.upsert({
                  create: { titleId: title.id, userId: itx.user.id },
                  update: { titleId: title.id },
                  where: { userId: itx.user.id },
                });

                await itx.editReply(`Ustawiono tytuł ${italic(title.name)}`);
              }),
          ),
      ),
  )
  .group("profil-tytuły", (group) =>
    group
      .setDescription("Zarządzanie tytułami profili")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("lista", (command) =>
        command
          .setDescription("Wyświetl wszystkie dostępne tytuły")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const where = { deletedAt: null };
            const paginator = new DatabasePaginator(
              (props) => prisma.profileTitle.findMany({ where, ...props }),
              () => prisma.profileTitle.count({ where }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Tytuły profili",
              ({ id, name }) => `${name} [${inlineCode(id.toString())}]`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("utwórz", (command) =>
        command
          .setDescription("Utwórz nowy tytuł")
          .addString("name", (name) => name.setDescription("Nazwa"))
          .handle(async ({ prisma }, { name }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const existingTitle = await prisma.profileTitle.findFirst({
              where: { name, deletedAt: null },
            });
            if (existingTitle) {
              await itx.editReply("Tytuł o tej nazwie już istnieje!");
              return;
            }

            await ensureUserExists(prisma, itx.user);
            const { id } = await prisma.profileTitle.create({
              data: { name, createdBy: itx.user.id },
            });

            await itx.editReply(
              `Utworzono nowy tytuł ${italic(name)} [${inlineCode(id.toString())}]`,
            );
          }),
      )
      .addCommand("dodaj-userowi", (command) =>
        command
          .setDescription("Dodaj tytuł profilu userowi")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addInteger("id", (id) => id.setDescription("ID tytułu"))
          .handle(async ({ prisma }, { user, id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const title = await prisma.profileTitle.findFirst({ where: { id } });
            if (!title) {
              await itx.editReply("Tytuł o tym ID nie istnieje!");
              return;
            }

            const existingOwnedTitle = await prisma.ownedProfileTitle.findFirst({
              where: { title, userId: user.id },
            });
            if (existingOwnedTitle) {
              await itx.editReply(
                `${user.tag} ma już tytuł [${inlineCode(id.toString())}]`,
              );
              return;
            }

            await ensureUserExists(prisma, user);
            await prisma.ownedProfileTitle.create({
              data: { titleId: title.id, userId: user.id },
            });

            await itx.editReply(`Dodano tytuł ${italic(title.name)} dla ${user.tag}`);
          }),
      ),
  );
