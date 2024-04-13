import { Hashira, PaginatedView } from "@hashira/core";
import { Paginate, schema } from "@hashira/db";
import { TimestampStyles, italic, time, userMention } from "discord.js";
import { and, count, eq, lte } from "drizzle-orm";
import { base } from "../base";

export const mutes = new Hashira({ name: "mutes" }).use(base).group("mutes", (group) =>
  group
    .setDescription("Sprawdzaj aktywne wyciszenia i historię wyciszeń")
    .setDMPermission(false)
    .addCommand("list", (command) =>
      command
        .setDescription("Wyświetl wszystkie aktywne wyciszenia")
        .handle(async ({ db }, _, itx) => {
          if (!itx.inCachedGuild()) return;

          const muteWheres = and(
            eq(schema.mute.guildId, itx.guildId),
            eq(schema.mute.deleted, false),
            lte(schema.mute.endsAt, itx.createdAt),
          );
          const paginate = new Paginate({
            orderByColumn: schema.mute.createdAt,
            orderBy: "DESC",
            select: db
              .select({
                id: schema.mute.id,
                createdAt: schema.mute.createdAt,
                reason: schema.mute.reason,
                moderatorId: schema.mute.moderatorId,
              })
              .from(schema.mute)
              .where(muteWheres)
              .$dynamic(),
            count: db
              .select({ count: count() })
              .from(schema.mute)
              .where(muteWheres)
              .$dynamic(),
          });

          const paginatedView = new PaginatedView(
            paginate,
            "Aktywne wyciszenia",
            ({ id, createdAt, reason, moderatorId }, _) =>
              `### ${userMention(moderatorId)} ${time(
                createdAt,
                TimestampStyles.ShortDateTime,
              )} [${id}]\nCzas trwania: \nPowód: ${italic(reason)}`,
            true,
          );
          await paginatedView.render(itx);
        }),
    )
    .addCommand("user", (command) =>
      command
        .setDescription("Wyświetl wyciszenia użytkownika")
        .addUser("user", (user) => user.setDescription("Użytkownik").setRequired(false))
        .handle(async ({ db }, { user: selectedUser }, itx) => {
          if (!itx.inCachedGuild()) return;

          const user = selectedUser ?? itx.user;
          const muteWheres = and(
            eq(schema.mute.guildId, itx.guildId),
            eq(schema.mute.userId, user.id),
            eq(schema.mute.deleted, false),
          );
          const paginate = new Paginate({
            orderByColumn: schema.mute.createdAt,
            orderBy: "DESC",
            select: db
              .select({
                id: schema.mute.id,
                createdAt: schema.mute.createdAt,
                reason: schema.mute.reason,
                moderatorId: schema.mute.moderatorId,
              })
              .from(schema.mute)
              .where(muteWheres)
              .$dynamic(),
            count: db
              .select({ count: count() })
              .from(schema.mute)
              .where(muteWheres)
              .$dynamic(),
          });

          const paginatedView = new PaginatedView(
            paginate,
            `Wyciszenia ${user.tag}`,
            ({ id, createdAt, reason, moderatorId }, _) =>
              `### ${userMention(moderatorId)} ${time(
                createdAt,
                TimestampStyles.ShortDateTime,
              )} [${id}]\nCzas trwania: \nPowód: ${italic(reason)}`,
            true,
          );
          await paginatedView.render(itx);
        }),
    ),
);
