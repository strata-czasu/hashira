import { Hashira, PaginatedView } from "@hashira/core";
import { Paginate, schema } from "@hashira/db";
import { add } from "date-fns";
import {
  PermissionFlagsBits,
  TimestampStyles,
  bold,
  italic,
  time,
  userMention,
} from "discord.js";
import { and, count, eq, gte } from "drizzle-orm";
import { base } from "../base";
import { durationToSeconds, parseDuration } from "../util/duration";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatUserWithId } from "./util";

export const mutes = new Hashira({ name: "mutes" })
  .use(base)
  .const((ctx) => ({
    ...ctx,
    getMuteRoleId: async (guildId: string) => {
      const settings = await ctx.db.query.guildSettings.findFirst({
        where: eq(schema.guildSettings.guildId, guildId),
      });
      if (!settings) return null;
      return settings.muteRoleId;
    },
  }))
  .group("mute", (group) =>
    group
      .setDescription("Zarządzaj wyciszeniami")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("add", (command) =>
        command
          .setDescription("Wycisz użytkownika")
          .addUser("user", (user) =>
            user.setDescription("Użytkownik, którego chcesz wyciszyć"),
          )
          .addString("duration", (duration) =>
            duration.setDescription("Czas trwania wyciszenia"),
          )
          .addString("reason", (reason) => reason.setDescription("Powód wyciszenia"))
          .handle(
            async (
              { db, messageQueue, getMuteRoleId },
              { user, duration: rawDuration, reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              const member = itx.guild.members.cache.get(user.id);
              if (!member) {
                await itx.reply({
                  content: "Nie znaleziono użytkownika na tym serwerze.",
                  ephemeral: true,
                });
                return;
              }

              const muteRoleId = await getMuteRoleId(itx.guildId);
              if (!muteRoleId) {
                await itx.reply({
                  // TODO: Add an actual link to the settings command
                  content:
                    "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
                  ephemeral: true,
                });
                return;
              }

              const duration = parseDuration(rawDuration);
              if (!duration) {
                await itx.reply({
                  content:
                    "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s",
                  ephemeral: true,
                });
                return;
              }
              const endsAt = add(itx.createdAt, duration);

              await db
                .insert(schema.user)
                .values({ id: user.id })
                .onConflictDoNothing();
              const res = await db
                .insert(schema.mute)
                .values({
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  reason,
                  endsAt,
                })
                .returning({ id: schema.mute.id });
              const mute = res[0] as { id: number };
              // FIXME: This could fail
              await member.roles.add(muteRoleId, `Wyciszenie: ${reason} [${mute.id}]`);
              await messageQueue.push(
                "muteEnd",
                { muteId: mute.id, guildId: itx.guildId, userId: user.id },
                durationToSeconds(duration),
              );

              const sentMessage = await sendDirectMessage(
                user,
                `Otrzymujesz wyciszenie na ${bold(itx.guild.name)}. Powód: ${italic(
                  reason,
                )}.\nKoniec: ${time(endsAt, TimestampStyles.RelativeTime)}`,
              );
              await itx.reply(
                `Dodano wyciszenie dla ${formatUserWithId(user)}. Powód: ${italic(
                  reason,
                )}.\nKoniec: ${time(endsAt, TimestampStyles.RelativeTime)}`,
              );
              if (!sentMessage) {
                await itx.followUp({
                  content: `Nie udało się wysłać wiadomości do ${formatUserWithId(
                    user,
                  )}.`,
                  ephemeral: true,
                });
              }
            },
          ),
      ),
  )
  .group("mutes", (group) =>
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
              gte(schema.mute.endsAt, itx.createdAt),
            );
            const paginate = new Paginate({
              orderByColumn: schema.mute.createdAt,
              orderBy: "DESC",
              select: db
                .select({
                  id: schema.mute.id,
                  createdAt: schema.mute.createdAt,
                  reason: schema.mute.reason,
                  userId: schema.mute.userId,
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
              ({ id, createdAt, reason, userId, moderatorId }, _) =>
                `### ${userMention(moderatorId)} ${time(
                  createdAt,
                  TimestampStyles.ShortDateTime,
                )} [${id}]\nUżytkownik: ${userMention(
                  userId,
                )}\nCzas trwania: \nPowód: ${italic(reason)}`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl wyciszenia użytkownika")
          .addUser("user", (user) =>
            user.setDescription("Użytkownik").setRequired(false),
          )
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
