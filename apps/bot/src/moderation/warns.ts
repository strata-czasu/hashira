import { Hashira, PaginatedView } from "@hashira/core";
import { Paginate, type Transaction, schema } from "@hashira/db";
import { and, count, eq, isNull } from "@hashira/db/drizzle";
import {
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  inlineCode,
  italic,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatUserWithId } from "./util";

const getWarn = async (tx: Transaction, id: number, guildId: string) =>
  tx
    .select()
    .from(schema.warn)
    .where(
      and(
        eq(schema.warn.guildId, guildId),
        eq(schema.warn.id, id),
        isNull(schema.warn.deletedAt),
      ),
    );

export const warns = new Hashira({ name: "warns" })
  .use(base)
  .group("warn", (group) =>
    group
      .setDescription("Zarządzaj ostrzeżeniami")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDMPermission(false)
      .addCommand("add", (command) =>
        command
          .setDescription("Dodaj ostrzeżenie")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("reason", (reason) => reason.setDescription("Powód ostrzeżenia"))
          .handle(async ({ db }, { user, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(db, user);

            const [warn] = await db
              .insert(schema.warn)
              .values({
                guildId: itx.guildId,
                userId: user.id,
                moderatorId: itx.user.id,
                reason,
              })
              .returning({ id: schema.warn.id });
            if (!warn) return;

            const sentMessage = await sendDirectMessage(
              user,
              `Hejka! Przed chwilą ${userMention(itx.user.id)} (${
                itx.user.tag
              }) nałożył Ci karę ostrzeżenia (warn). Powodem Twojego ostrzeżenia jest: ${italic(
                reason,
              )}.\n\nPrzeczytaj powód ostrzeżenia i nie rób więcej tego za co zostałxś ostrzeżony. W innym razie możesz otrzymać karę wyciszenia.`,
            );

            await itx.editReply(
              `Dodano ostrzeżenie [${inlineCode(
                warn.id.toString(),
              )}] dla ${formatUserWithId(user)}.\nPowód: ${italic(reason)}`,
            );
            if (!sentMessage) {
              await itx.followUp({
                content: `Nie udało się wysłać wiadomości do ${formatUserWithId(
                  user,
                )}.`,
                ephemeral: true,
              });
            }
          }),
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Usuń ostrzeżenie")
          .addInteger("id", (id) => id.setDescription("ID ostrzeżenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Powód usunięcia ostrzeżenia").setRequired(false),
          )
          .handle(async ({ db }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const warn = await db.transaction(async (tx) => {
              const [warn] = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await errorFollowUp(itx, "Nie znaleziono ostrzeżenia o podanym ID");
                return null;
              }
              // TODO: Save a log of this update in the database
              await tx
                .update(schema.warn)
                .set({ deletedAt: new Date(), deleteReason: reason })
                .where(eq(schema.warn.id, id));
              return warn;
            });
            if (!warn) return;

            if (reason) {
              await itx.editReply(
                `Usunięto ostrzeżenie ${inlineCode(
                  id.toString(),
                )}.\nPowód usunięcia: ${italic(reason)}`,
              );
            } else {
              itx.editReply(`Usunięto ostrzeżenie ${inlineCode(id.toString())}`);
            }
          }),
      )
      .addCommand("edit", (command) =>
        command
          .setDescription("Edytuj ostrzeżenie")
          .addInteger("id", (id) => id.setDescription("ID ostrzeżenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Nowy powód ostrzeżenia"),
          )
          .handle(async ({ db }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const warn = await db.transaction(async (tx) => {
              const [warn] = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await itx.deleteReply();
                await itx.followUp({
                  content: "Nie znaleziono ostrzeżenia o podanym ID",
                  ephemeral: true,
                });
                return null;
              }
              const originalReason = warn.reason;
              // TODO: Save a log of this edit in the database
              await tx
                .update(schema.warn)
                .set({ reason })
                .where(eq(schema.warn.id, id));

              await discordTry(
                async () => {
                  const member = await itx.guild.members.fetch(warn.userId);
                  await sendDirectMessage(
                    member.user,
                    `Twoje ostrzeżenie zostało zedytowane przez ${userMention(
                      itx.user.id,
                    )} (${itx.user.tag}).\n\nPoprzedni powód ostrzeżenia: ${italic(
                      originalReason,
                    )}\nNowy powód ostrzeżenia: ${italic(reason)}`,
                  );
                },
                [RESTJSONErrorCodes.UnknownMember],
                async () => {},
              );

              return warn;
            });
            if (!warn) return;

            await itx.editReply(
              `Zaktualizowano ostrzeżenie ${inlineCode(
                id.toString(),
              )}. Nowy powód: ${italic(reason)}`,
            );
          }),
      ),
  )
  .group("warns", (group) =>
    group
      .setDescription("Wyświetl ostrzeżenia")
      .setDMPermission(false)
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl ostrzeżenia użytkownika")
          .addUser("user", (user) =>
            user.setDescription("Użytkownik").setRequired(false),
          )
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false),
          )
          .handle(async ({ db }, { user: selectedUser, deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const user = selectedUser ?? itx.user;
            const warnWheres = and(
              eq(schema.warn.guildId, itx.guildId),
              eq(schema.warn.userId, user.id),
              deleted ? undefined : isNull(schema.warn.deletedAt),
            );
            const paginate = new Paginate({
              orderBy: schema.warn.createdAt,
              ordering: "DESC",
              select: db.select().from(schema.warn).where(warnWheres).$dynamic(),
              count: db
                .select({ count: count() })
                .from(schema.warn)
                .where(warnWheres)
                .$dynamic(),
            });

            const paginatedView = new PaginatedView(
              paginate,
              `Ostrzeżenia ${user.tag}`,
              ({ id, createdAt, deletedAt, reason, moderatorId, deleteReason }, _) => {
                if (deletedAt) {
                  return `### ~~${userMention(moderatorId)} ${time(
                    createdAt,
                    TimestampStyles.ShortDateTime,
                  )} [${id}]~~\nPowód: ${italic(reason)}\nData usunięcia: ${time(
                    deletedAt,
                    TimestampStyles.ShortDateTime,
                  )}`.concat(
                    deleteReason ? `\nPowód usunięcia: ${italic(deleteReason)}` : "",
                  );
                }
                return `### ${userMention(moderatorId)} ${time(
                  createdAt,
                  TimestampStyles.ShortDateTime,
                )} [${id}]\nPowód: ${italic(reason)}`;
              },
              true,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
