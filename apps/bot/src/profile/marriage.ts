import { ConfirmationDialog, Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import { userMention } from "discord.js";
import { base } from "../base";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";

export const marriage = new Hashira({ name: "marriage" })
  .use(base)
  .command("marry", (command) =>
    command
      .setDescription("Oświadcz się komuś")
      .setDMPermission(false)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ db, lock }, { user: { id: targetUserId } }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUsersExist(db, [itx.user.id, targetUserId]);

        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, itx.user.id),
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

        const targetUser = await db.query.user.findFirst({
          where: eq(schema.user.id, targetUserId),
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
            await db.transaction(async (tx) => {
              await tx
                .update(schema.user)
                .set({ marriedTo: targetUser.id, marriedAt: itx.createdAt })
                .where(eq(schema.user.id, user.id));
              await tx
                .update(schema.user)
                .set({ marriedTo: user.id, marriedAt: itx.createdAt })
                .where(eq(schema.user.id, targetUser.id));
            });
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
        );
        await lock.run(
          [itx.user.id, targetUserId],
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
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ db }, { user: { id: targetUserId } }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUsersExist(db, [itx.user.id, targetUserId]);

        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, itx.user.id),
        });
        if (!user) return;
        if (!user.marriedTo) {
          return await errorFollowUp(itx, "Nie jesteś w związku!");
        }

        const targetUser = await db.query.user.findFirst({
          where: eq(schema.user.id, targetUserId),
        });
        if (!targetUser) return;
        if (user.marriedTo !== targetUserId) {
          return await errorFollowUp(
            itx,
            `Nie jesteś w związku z ${userMention(targetUserId)}!`,
          );
        }

        const dialog = new ConfirmationDialog(
          `Czy na pewno chcesz się rozwieść z ${userMention(
            targetUserId,
          )}? :broken_heart:`,
          "Tak",
          "Nie",
          async () => {
            await db.transaction(async (tx) => {
              await tx
                .update(schema.user)
                .set({ marriedTo: null, marriedAt: null })
                .where(eq(schema.user.id, user.id));
              await tx
                .update(schema.user)
                .set({ marriedTo: null, marriedAt: null })
                .where(eq(schema.user.id, targetUserId));
            });
            await itx.editReply({
              content: `${userMention(itx.user.id)} i ${userMention(
                targetUserId,
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
        );
        await dialog.render(itx);
      }),
  );
