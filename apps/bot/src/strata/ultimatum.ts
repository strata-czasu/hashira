import { Hashira } from "@hashira/core";
import { addSeconds } from "date-fns";
import { PermissionFlagsBits, bold } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU } from "../specializedConstants";
import { parseUserMentionWorkaround } from "../util/parseUsers";
import { sendDirectMessage } from "../util/sendDirectMessage";

const ULTIMATUM_BASE_MESSAGE = [
  "Hej,",
  "otrzymujesz z dniem dzisiejszym Ultimatum. Oznacza to, że jeżeli otrzymasz jakąkolwiek karę w ciągu najbliższych 60 dni, to zostanie na Ciebie nałożona automatyczna kara w postaci bana.",
  "**Zasady ultimatum**: https://discord.com/channels/211261411119202305/1242497355240968295/1242501552900669500",
];

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
              console.log("xd");
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const user = await parseUserMentionWorkaround(rawUser, itx);
              if (!user) {
                await itx.editReply("Nie znaleziono użytkownika");
                return;
              }

              const currentUltimatum = await prisma.ultimatum.findFirst({
                where: { userId: user.id, guildId: itx.guild.id, endedAt: null },
              });

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
                [...ULTIMATUM_BASE_MESSAGE, `${bold("Powód")}: ${reason}`].join("\n"),
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
          .addNumber("id", (id) => id.setDescription("ID ultimatum"))
          .addBoolean("force", (force) =>
            force.setDescription("Zakończ ultimatum siłą").setRequired(false),
          )
          .handle(
            async (
              { prisma, messageQueue, strataCzasuLog: log },
              { id, force },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const ultimatum = await prisma.ultimatum.findFirst({
                where: { id, guildId: itx.guild.id, endedAt: null },
              });

              if (!ultimatum) {
                await itx.editReply("Nie znaleziono aktywnego ultimatum o podanym ID");
                return;
              }

              await messageQueue.updateDelay("ultimatumEnd", id.toString(), new Date());

              if (force) {
                await prisma.ultimatum.update({
                  where: { id },
                  data: { endedAt: new Date() },
                });
              }

              await itx.editReply("Zakończono ultimatum");
            },
          ),
      ),
  );
