import { Hashira, PaginatedView } from "@hashira/core";
import { Paginate, schema } from "@hashira/db";
import {
  type ChatInputCommandInteraction,
  DiscordAPIError,
  type Guild,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  type User,
  bold,
  inlineCode,
  italic,
  time,
  userMention,
} from "discord.js";
import { and, count, eq } from "drizzle-orm";
import { base } from "../base";

const formatUserWithId = (user: User) => `${bold(user.tag)} (${inlineCode(user.id)})`;

const sendUserWarnMessage = async (guild: Guild, user: User, reason: string) => {
  try {
    await user.send(
      `Otrzymujesz ostrzeżenie na ${bold(guild.name)}. Powód: ${italic(reason)}`,
    );
    return true;
  } catch (e) {
    if (
      e instanceof DiscordAPIError &&
      e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
    ) {
      return false;
    }
    throw e;
  }
};

const warnNotFound = async (itx: ChatInputCommandInteraction) => {
  await itx.reply({
    content: "Nie znaleziono ostrzeżenia o podanym ID",
    ephemeral: true,
  });
};

export const warns = new Hashira({ name: "warns" })
  .use(base)
  .derive(({ db }) => ({
    /** Get a warn by ID and automatically replying if it doesn't exist */
    getWarn: async (id: number, guildId: string) =>
      db.query.warn.findFirst({
        where: and(
          eq(schema.warn.guildId, guildId),
          eq(schema.warn.id, id),
          eq(schema.warn.deleted, false),
        ),
      }),
  }))
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

            await db
              .insert(schema.warn)
              .values({
                guildId: itx.guildId,
                userId: user.id,
                moderatorId: itx.user.id,
                reason,
              })
              .execute();

            const sentMessage = await sendUserWarnMessage(itx.guild, user, reason);
            // biome-ignore format: Long message
            await itx.reply(
              `Dodano ostrzeżenie dla ${formatUserWithId(user)}. Powód: ${italic(reason)}`,
            );
            if (!sentMessage) {
              // biome-ignore format: Long message
              await itx.followUp({
                content: `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
                ephemeral: true,
              });
            }
          }),
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Usuń ostrzeżenie")
          .addNumber("id", (id) => id.setDescription("ID ostrzeżenia"))
          .addString("reason", (reason) =>
            reason.setDescription("Powód usunięcia ostrzeżenia").setRequired(false),
          )
          .handle(async ({ db, getWarn }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;

            const warn = await getWarn(id, itx.guildId);
            if (!warn) return warnNotFound(itx);

            // TODO: Save a log of this update in the database
            await db
              .update(schema.warn)
              .set({ deletedAt: new Date(), deleted: true, deleteReason: reason })
              .where(eq(schema.warn.id, id));
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
          .addNumber("id", (id) => id.setDescription("ID ostrzeżenia"))
          .addString("reason", (reason) =>
            reason.setDescription("Nowy powód ostrzeżenia"),
          )
          .handle(async ({ db, getWarn }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;

            const warn = await getWarn(id, itx.guildId);
            if (!warn) return warnNotFound(itx);

            // TODO: Save a log of this edit in the database
            await db.update(schema.warn).set({ reason }).where(eq(schema.warn.id, id));
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
          .handle(async ({ db }, { user: selectedUser }, itx) => {
            if (!itx.inCachedGuild()) return;

            const user = selectedUser ?? itx.user;
            const warnWheres = and(
              eq(schema.warn.guildId, itx.guildId),
              eq(schema.warn.userId, user.id),
              eq(schema.warn.deleted, false),
            );
            const paginate = new Paginate({
              orderByColumn: schema.warn.createdAt,
              orderBy: "DESC",
              select: db
                .select({
                  id: schema.warn.id,
                  createdAt: schema.warn.createdAt,
                  reason: schema.warn.reason,
                  moderatorId: schema.warn.moderatorId,
                })
                .from(schema.warn)
                .where(warnWheres)
                .$dynamic(),
              count: db
                .select({ count: count() })
                .from(schema.warn)
                .where(warnWheres)
                .$dynamic(),
            });

            const paginatedView = new PaginatedView(
              paginate,
              `Ostrzeżenia ${user.tag}`,
              ({ id, createdAt, reason, moderatorId }, _) =>
                `### ${userMention(moderatorId)} ${time(
                  createdAt,
                  TimestampStyles.ShortDateTime,
                )} [${id}]\nPowód: ${italic(reason)}`,
              true,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
