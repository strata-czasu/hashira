import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import { addSeconds } from "date-fns";
import {
  type Guild,
  PermissionFlagsBits,
  type User,
  italic,
  userMention,
} from "discord.js";
import { base } from "../base";
import { STRATA_CZASU } from "../specializedConstants";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { parseUserMentionWorkaround } from "../util/parseUsers";
import { sendDirectMessage } from "../util/sendDirectMessage";

export const getCurrentUltimatum = async (
  prisma: ExtendedPrismaClient,
  guild: Guild,
  user: User,
) => {
  return prisma.ultimatum.findFirst({
    where: { userId: user.id, guildId: guild.id, endedAt: null },
  });
};

const ULTIMATUM_TEMPLATE = `
## Hejka {{mention}}!
Przed chwilą **nałożyłem Ci rolę Ultimatum**. Jeżeli przez najbliższe **60 dni** otrzymasz jakąkolwiek **karę Mute** na naszym serwerze, to niestety będę musiał **zamienić Ci ją na bana** - na tym polega posiadanie Ultimatum. Mam nadzieję, że przez najbliższe dwa miesiące nie złamiesz naszych Zasad dostępnych pod [tym linkiem](https://discord.com/channels/211261411119202305/873167662082056232/1270484486131290255) i zostaniesz z nami na serwerze na dłużej. W razie pytań zapraszam Cię na nasz [kanał od ticketów](https://discord.com/channels/211261411119202305/1213901611836117052/1219338768012804106).

**Oto powód Twojego Ultimatum:**
*{{reason}}*

Pozdrawiam,
Biszkopt
`;

export const ultimatum = new Hashira({ name: "ultimatum" })
  .use(base)
  .group("ultimatum", (group) =>
    group
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDescription("Zarządzaj ultimatum użytkowników")
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Dodaj użytkownikowi ultimatum")
          .addString("użytkownik", (user) => user.setDescription("Użytkownik"))
          .addString("powód", (reason) => reason.setDescription("Powód ultimatum"))
          .handle(
            async (
              { prisma, messageQueue, strataCzasuLog },
              { użytkownik: rawUser, powód: reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const user = await parseUserMentionWorkaround(rawUser, itx);

              if (!user) {
                await itx.editReply("Nie znaleziono użytkownika");
                return;
              }

              await ensureUsersExist(prisma, [itx.user, user]);

              const currentUltimatum = await getCurrentUltimatum(
                prisma,
                itx.guild,
                user,
              );

              if (currentUltimatum) {
                await itx.editReply("Użytkownik ma już aktywne ultimatum");
                return;
              }

              const createdAt = new Date();
              const expiresAt = addSeconds(createdAt, STRATA_CZASU.ULTIMATUM_DURATION);

              const createdUltimatum = await prisma.ultimatum.create({
                data: {
                  userId: user.id,
                  guildId: itx.guild.id,
                  createdAt,
                  expiresAt,
                  reason,
                },
              });

              await itx.member.roles.add(
                STRATA_CZASU.ULTIMATUM_ROLE,
                `Dodano ultimatum: ${reason} (${expiresAt}) przez ${itx.user.tag}`,
              );

              await sendDirectMessage(
                user,
                ULTIMATUM_TEMPLATE.replace("{{mention}}", userMention(user.id)).replace(
                  "{{reason}}",
                  italic(reason),
                ),
              );

              strataCzasuLog.push("ultimatumStart", itx.guild, {
                user,
                reason,
                createdAt,
                expiresAt,
              });

              await messageQueue.push(
                "ultimatumEnd",
                { guildId: itx.guild.id, userId: user.id },
                expiresAt,
                createdUltimatum.id.toString(),
              );

              await itx.editReply("Dodano ultimatum");
            },
          ),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("Wyświetl aktywne ultimatum")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const ultimatums = await prisma.ultimatum.findMany({
              where: { guildId: itx.guild.id, endedAt: null },
            });

            if (!ultimatums.length) {
              await itx.editReply("Brak aktywnych ultimatum");
              return;
            }

            const content = ultimatums
              .map(
                (ultimatum) =>
                  `**${ultimatum.id}** - <@${ultimatum.userId}> - ${ultimatum.reason}`,
              )
              .join("\n");

            await itx.editReply(content);
          }),
      )
      .addCommand("zakończ", (command) =>
        command
          .setDescription("Zakończ aktywne ultimatum")
          .addBoolean("force", (force) =>
            force.setDescription("Zakończ ultimatum siłą").setRequired(false),
          )
          .handle(async ({ prisma, messageQueue }, { force }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const ultimatum = await getCurrentUltimatum(prisma, itx.guild, itx.user);

            if (!ultimatum) {
              await itx.editReply("Nie znaleziono aktywnego ultimatum");
              return;
            }

            await messageQueue.updateDelay(
              "ultimatumEnd",
              ultimatum.id.toString(),
              new Date(),
            );

            if (force) {
              await prisma.ultimatum.update({
                where: { id: ultimatum.id },
                data: { endedAt: new Date() },
              });
            }

            await itx.editReply("Zakończono ultimatum");
          }),
      ),
  )
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const ultimatum = await getCurrentUltimatum(prisma, member.guild, member.user);

    if (!ultimatum) return;

    await member.roles.add(STRATA_CZASU.ULTIMATUM_ROLE, "Dodano ultimatum");
  });
