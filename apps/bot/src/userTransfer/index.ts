import { Hashira } from "@hashira/core";
import type { Prisma } from "@hashira/db";
import { PermissionFlagsBits, RESTJSONErrorCodes, userMention } from "discord.js";
import { base } from "../base";
import { formatUserWithId } from "../moderation/util";
import { formatVerificationType } from "../moderation/verification";
import { discordTry } from "../util/discordTry";
import { ensureUsersExist } from "../util/ensureUsersExist";

export const userTransfer = new Hashira({ name: "user-transfer" })
  .use(base)
  .command("przenieś", (command) =>
    command
      .setDescription("Przenieś dane użytkownika")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDMPermission(false)
      .addUser("stary-user", (user) =>
        user.setDescription("Użytkownik, którego dane chcesz przenieść"),
      )
      .addUser("nowy-user", (user) =>
        user.setDescription("Użytkownik, do którego chcesz przenieść dane"),
      )
      .handle(
        async ({ prisma }, { "stary-user": oldUser, "nowy-user": newUser }, itx) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          const oldMember = await discordTry(
            async () => itx.guild.members.fetch(oldUser.id),
            [RESTJSONErrorCodes.UnknownMember],
            () => null,
          );
          const newMember = await discordTry(
            async () => itx.guild.members.fetch(newUser.id),
            [RESTJSONErrorCodes.UnknownMember],
            () => null,
          );

          // TODO: Log transfers to the appropriate loggers

          await itx.editReply(
            `Przenoszenie danych ${formatUserWithId(oldUser)} do ${formatUserWithId(newUser)}...`,
          );

          if (oldMember && newMember) {
            const roles = oldMember.roles.cache
              .filter((r) => r !== oldMember.guild.roles.everyone)
              .map((r) => r);
            if (roles.length > 0) {
              await itx.followUp(`Kopiowanie ${roles.length} roli...`);
              await newMember.roles.add(
                roles,
                `Przeniesienie roli z użytkownika ${oldMember.user.tag} (${oldMember.id}), moderator: ${itx.user.tag} (${itx.user.id})`,
              );
            }
          }

          await ensureUsersExist(prisma, [oldUser.id, newUser.id]);
          const oldDbUser = await prisma.user.findUnique({
            where: { id: oldUser.id },
          });
          const newDbUser = await prisma.user.findUnique({
            where: { id: newUser.id },
          });
          if (!oldDbUser || !newDbUser) return;

          // Verification level
          if (oldDbUser.verificationLevel) {
            await itx.followUp(
              `Kopiowanie poziomu weryfikacji (${formatVerificationType(oldDbUser.verificationLevel)})...`,
            );
            await prisma.user.update({
              where: { id: newUser.id },
              data: { verificationLevel: oldDbUser?.verificationLevel },
            });
          }

          // Text activity
          {
            const where: Prisma.UserTextActivityWhereInput = {
              userId: oldUser.id,
              guildId: itx.guildId,
            };
            const count = await prisma.userTextActivity.count({ where });
            await itx.followUp(`Przenoszenie aktywności tekstowej (${count})...`);
            await prisma.userTextActivity.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // TODO: Voice activity

          // TODO: Experience and level

          // Inventory
          {
            const where: Prisma.InventoryItemWhereInput = { userId: oldUser.id };
            const count = await prisma.inventoryItem.count({ where });
            await itx.followUp(`Przenoszenie przedmiotów (${count})...`);
            await prisma.inventoryItem.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // TODO: Wallets and balances

          // Ultimatums
          {
            const where: Prisma.UltimatumWhereInput = { userId: oldUser.id };
            const count = await prisma.ultimatum.count({ where });
            await itx.followUp(`Przenoszenie ultimatum (${count})...`);
            await prisma.ultimatum.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // Mutes
          {
            const where: Prisma.MuteWhereInput = { userId: oldUser.id };
            const count = await prisma.mute.count({ where });
            await itx.followUp(`Przenoszenie wyciszeń (${count})...`);
            await prisma.mute.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // Warns
          {
            const where: Prisma.WarnWhereInput = { userId: oldUser.id };
            const count = await prisma.warn.count({ where });
            await itx.followUp(`Przenoszenie ostrzeżeń (${count})...`);
            await prisma.warn.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // DM Poll participations
          {
            const where: Prisma.DmPollParticipantWhereInput = { userId: oldUser.id };
            const count = await prisma.dmPollParticipant.count({ where });
            await itx.followUp(`Przenoszenie uczestnictwa w ankietach (${count})...`);
            await prisma.dmPollParticipant.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // DM Poll votes
          {
            const where: Prisma.DmPollVoteWhereInput = { userId: oldUser.id };
            const count = await prisma.dmPollVote.count({ where });
            await itx.followUp(`Przenoszenie głosów w ankietach (${count})...`);
            await prisma.dmPollVote.updateMany({
              where,
              data: { userId: newUser.id },
            });
          }

          // DM Poll exclusion
          await itx.followUp("Przenoszenie wykluczenia z ankiet...");
          await prisma.dmPollExclusion.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id },
          });

          // Marriage
          if (oldDbUser.marriedTo) {
            await itx.followUp(
              `Stary user ma aktywne małżeństwo. Rozwodzenie ${userMention(oldDbUser.id)} (${oldDbUser.id}) z ${userMention(oldDbUser.marriedTo)} (${oldDbUser.marriedTo})...`,
            );
            await prisma.user.updateMany({
              where: { id: { in: [oldDbUser.id, oldDbUser.marriedTo] } },
              data: { marriedTo: null, marriedAt: null },
            });
          }

          await itx.followUp("Przeniesiono dane użytkownika");
        },
      ),
  );
