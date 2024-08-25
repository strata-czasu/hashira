import { ConfirmationDialog, Hashira } from "@hashira/core";
import { userMention } from "discord.js";
import { base } from "../base";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";

export const marriage = new Hashira({ name: "marriage" })
  .use(base)
  .command("marry", (command) =>
    command
      .setDescription("Oświadcz się komuś")
      .setDMPermission(false)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ prisma, lock }, { user: { id: targetUserId } }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUsersExist(prisma, [itx.user.id, targetUserId]);

        const user = await prisma.user.findFirst({
          where: {
            id: itx.user.id,
          },
        });

        if (!user) return;
        if (user.marriedTo) {
          return await errorFollowUp(
            itx,
            `Jesteś już w związku z ${userMention(user.marriedTo)}!`,
          );
        }

        if (targetUserId === itx.user.id) {
          return await errorFollowUp(itx, "Nie możesz oświadczyć się samemu sobie!");
        }

        const targetUser = await prisma.user.findFirst({
          where: {
            id: targetUserId,
          },
        });

        if (!targetUser) return;
        if (targetUser.marriedTo) {
          return await errorFollowUp(
            itx,
            `${userMention(user.id)} jest już w związku z ${userMention(
              targetUser.marriedTo,
            )}!`,
          );
        }

        // TODO)) Add the target user to allowed mentions
        const dialog = new ConfirmationDialog(
          `${userMention(targetUser.id)}, czy chcesz poślubić ${userMention(
            user.id,
          )}? :ring:`,
          "Tak",
          "Nie",
          async () => {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: user.id },
                data: { marriedTo: targetUser.id, marriedAt: itx.createdAt },
              }),
              prisma.user.update({
                where: { id: targetUser.id },
                data: { marriedTo: user.id, marriedAt: itx.createdAt },
              }),
            ]);

            await itx.editReply({
              content: `Gratulacje! ${userMention(itx.user.id)} i ${userMention(
                targetUser.id,
              )} są teraz małżeństwem! :tada:`,
              components: [],
            });
          },
          async () => {
            await itx.editReply({
              content: `Niestety ${userMention(
                itx.user.id,
              )} odrzucił Twoje oświadczyny. :broken_heart:`,
              components: [],
            });
          },
          (action) => action.user.id === targetUser.id,
          async () => {
            await itx.editReply({
              content: `${userMention(targetUser.id)} nie odpowiedział na czas.`,
              components: [],
            });
          },
        );
        await lock.run(
          [`marriage_${itx.user.id}`, `marriage_${targetUserId}`],
          async () => dialog.render(itx),
          () =>
            errorFollowUp(
              itx,
              "Masz już aktywne oświadczyny lub ktoś inny właśnie oświadczył się tej osobie! Poczekaj aż sytuacja się wyjaśni.",
            ),
        );
      }),
  )
  .command("divorce", (command) =>
    command
      .setDescription("Rozwiedź się")
      .setDMPermission(false)
      .handle(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUserExists(prisma, itx.user.id);

        const user = await prisma.user.findFirst({
          where: { id: itx.user.id },
        });
        if (!user) return;
        if (!user.marriedTo) {
          return await errorFollowUp(itx, "Nie jesteś w związku!");
        }

        const targetUser = await prisma.user.findFirst({
          where: { id: user.marriedTo },
        });
        if (!targetUser) return;

        const dialog = new ConfirmationDialog(
          `Czy na pewno chcesz się rozwieść z ${userMention(
            targetUser.id,
          )}? :broken_heart:`,
          "Tak",
          "Nie",
          async () => {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: user.id },
                data: { marriedTo: null, marriedAt: null },
              }),
              prisma.user.update({
                where: { id: targetUser.id },
                data: { marriedTo: null, marriedAt: null },
              }),
            ]);

            await itx.editReply({
              content: `${userMention(itx.user.id)} i ${userMention(
                targetUser.id,
              )} nie są już małżeństwem. :broken_heart:`,
              components: [],
            });
          },
          async () => {
            await itx.editReply({
              content: "Rozwód anulowany.",
              components: [],
            });
          },
          (action) => action.user.id === user.id,
          async () => {
            await itx.editReply({
              content: "Minął czas na decyzję.",
              components: [],
            });
          },
        );
        await dialog.render(itx);
      }),
  );
