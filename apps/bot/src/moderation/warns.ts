import { Hashira, PaginatedView } from "@hashira/core";
import { Paginate, type Transaction, schema } from "@hashira/db";
import { and, count, eq, isNull } from "@hashira/db/drizzle";
import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  TimestampStyles,
  bold,
  inlineCode,
  italic,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatUserWithId } from "./util";

const warnNotFound = async (itx: ChatInputCommandInteraction) => {
  await itx.reply({
    content: "Nie znaleziono ostrzeżenia o podanym ID",
    ephemeral: true,
  });
};

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
              `Otrzymujesz ostrzeżenie na ${bold(itx.guild.name)}. Powód: ${italic(
                reason,
              )}`,
            );
            await itx.reply(
              `Dodano ostrzeżenie [${inlineCode(
                warn.id.toString(),
              )}] dla ${formatUserWithId(user)}. Powód: ${italic(reason)}`,
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

            const warn = await db.transaction(async (tx) => {
              const [warn] = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await warnNotFound(itx);
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
              await itx.reply(
                `Usunięto ostrzeżenie ${inlineCode(
                  id.toString(),
                )}. Powód usunięcia: ${italic(reason)}`,
              );
            } else {
              itx.reply(`Usunięto ostrzeżenie ${inlineCode(id.toString())}`);
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

            const warn = await db.transaction(async (tx) => {
              const [warn] = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await warnNotFound(itx);
                return null;
              }
              // TODO: Save a log of this edit in the database
              await tx
                .update(schema.warn)
                .set({ reason })
                .where(eq(schema.warn.id, id));
              return warn;
            });
            if (!warn) return;

            await itx.reply(
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
              orderByColumn: schema.warn.createdAt,
              orderBy: "DESC",
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
