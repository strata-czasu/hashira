import { Hashira, PaginatedView } from "@hashira/core";
import { Paginate, type Transaction, schema } from "@hashira/db";
import { and, count, eq, gte, isNull } from "@hashira/db/drizzle";
import { add, intervalToDuration } from "date-fns";
import {
  HeadingLevel,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  bold,
  channelMention,
  heading,
  inlineCode,
  italic,
  strikethrough,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { durationToSeconds, formatDuration, parseDuration } from "../util/duration";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatUserWithId } from "./util";

const formatMuteLength = (mute: typeof schema.mute.$inferSelect) => {
  const { createdAt, endsAt } = mute;
  const duration = intervalToDuration({ start: createdAt, end: endsAt });
  const durationParts = [];
  if (duration.days) durationParts.push(`${duration.days}d`);
  if (duration.hours) durationParts.push(`${duration.hours}h`);
  if (duration.minutes) durationParts.push(`${duration.minutes}m`);
  if (duration.seconds) durationParts.push(`${duration.seconds}s`);
  if (durationParts.length === 0) return "0s";
  return durationParts.join(" ");
};

const formatMuteInList = (mute: typeof schema.mute.$inferSelect, _idx: number) => {
  const { id, createdAt, deletedAt, reason, moderatorId, deleteReason } = mute;

  const header = heading(
    `${userMention(moderatorId)} ${time(
      createdAt,
      TimestampStyles.ShortDateTime,
    )} [${id}]`,
    HeadingLevel.Three,
  );

  const lines = [
    deletedAt ? strikethrough(header) : header,
    `Czas trwania: ${formatMuteLength(mute)}`,
    `Powód: ${italic(reason)}`,
  ];

  if (deletedAt) {
    lines.push(`Data usunięcia: ${time(deletedAt, TimestampStyles.ShortDateTime)}`);
  }
  if (deleteReason) {
    lines.push(`Powód usunięcia: ${italic(deleteReason)}`);
  }

  return lines.join("\n");
};

const getMute = async (tx: Transaction, id: number, guildId: string) =>
  tx
    .select()
    .from(schema.mute)
    .where(
      and(
        eq(schema.mute.guildId, guildId),
        eq(schema.mute.id, id),
        isNull(schema.mute.deletedAt),
      ),
    );

const RULES_CHANNEL = "873167662082056232";
const APPEALS_CHANNEL = "1213901611836117052";

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
              await itx.deferReply();

              const member = itx.guild.members.cache.get(user.id);
              if (!member) {
                await errorFollowUp(itx, "Nie znaleziono użytkownika na tym serwerze.");
                return;
              }

              const muteRoleId = await getMuteRoleId(itx.guildId);
              if (!muteRoleId) {
                // TODO: Add an actual link to the settings command
                await errorFollowUp(
                  itx,
                  "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
                );
                return;
              }

              const duration = parseDuration(rawDuration);
              if (!duration) {
                await errorFollowUp(
                  itx,
                  "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`",
                );
                return;
              }
              const endsAt = add(itx.createdAt, duration);

              await db
                .insert(schema.user)
                .values([{ id: user.id }, { id: itx.user.id }])
                .onConflictDoNothing();

              // Create mute and try to add the mute role
              // If adding the role fails, rollback the transaction
              const mute = await db.transaction(async (tx) => {
                const [mute] = await db
                  .insert(schema.mute)
                  .values({
                    guildId: itx.guildId,
                    userId: user.id,
                    moderatorId: itx.user.id,
                    reason,
                    endsAt,
                  })
                  .returning({ id: schema.mute.id });
                if (!mute) return null;

                return discordTry(
                  async () => {
                    if (member.voice.channel) {
                      await member.voice.disconnect(
                        `Wyciszenie: ${reason} [${mute.id}]`,
                      );
                    }
                    await member.roles.add(
                      muteRoleId,
                      `Wyciszenie: ${reason} [${mute.id}]`,
                    );
                    return mute;
                  },
                  [RESTJSONErrorCodes.MissingPermissions],
                  async () => {
                    await errorFollowUp(
                      itx,
                      "Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.",
                    );
                    tx.rollback();
                    return null;
                  },
                );
              });
              if (!mute) return;

              await messageQueue.push(
                "muteEnd",
                { muteId: mute.id, guildId: itx.guildId, userId: user.id },
                durationToSeconds(duration),
                mute.id.toString(),
              );

              const sentMessage = await sendDirectMessage(
                user,
                `Hejka! Przed chwilą ${userMention(itx.user.id)} (${
                  itx.user.tag
                }) nałożył Ci karę wyciszenia (mute). Musiałem więc niestety odebrać Ci prawo do pisania i mówienia na ${bold(
                  formatDuration(duration),
                )}. Powodem Twojego wyciszenia jest: ${italic(
                  reason,
                )}.\n\nPrzeczytaj ${channelMention(
                  RULES_CHANNEL,
                )} i jeżeli nie zgadzasz się z powodem Twojej kary, to odwołaj się od niej klikając czerwony przycisk "Odwołaj się" na kanale ${channelMention(
                  APPEALS_CHANNEL,
                )}. W odwołaniu spinguj nick osoby, która nałożyła Ci karę.`,
              );

              await itx.editReply(
                `Dodano wyciszenie [${inlineCode(
                  mute.id.toString(),
                )}] dla ${formatUserWithId(user)}. Powód: ${italic(
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
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Usuń wyciszenie")
          .addInteger("id", (id) => id.setDescription("ID wyciszenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Powód usunięcia wyciszenia").setRequired(false),
          )
          .handle(async ({ db, messageQueue, getMuteRoleId }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const mute = await db.transaction(async (tx) => {
              const [mute] = await getMute(tx, id, itx.guildId);
              if (!mute) {
                await errorFollowUp(itx, "Nie znaleziono wyciszenia o podanym ID");
                return null;
              }
              // TODO: Save a log of this edit in the database
              await tx
                .update(schema.mute)
                .set({ deletedAt: itx.createdAt, deleteReason: reason })
                .where(eq(schema.mute.id, id));
              return mute;
            });
            if (!mute) return;

            const muteRoleId = await getMuteRoleId(itx.guildId);
            const member = itx.guild.members.cache.get(mute.userId);
            // NOTE: This could fail if the mute role was removed or the member left the server
            if (muteRoleId && member) {
              await member.roles.remove(
                muteRoleId,
                `Usunięcie wyciszenia [${mute.id}]`,
              );
            }
            await messageQueue.cancel("muteEnd", mute.id.toString());

            if (reason) {
              await itx.editReply(
                `Usunięto wyciszenie ${inlineCode(
                  id.toString(),
                )}. Powód usunięcia: ${italic(reason)}`,
              );
            } else {
              itx.editReply(`Usunięto wyciszenie ${inlineCode(id.toString())}`);
            }
          }),
      )
      .addCommand("edit", (command) =>
        command
          .setDescription("Edytuj wyciszenie")
          .addInteger("id", (id) => id.setDescription("ID wyciszenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Nowy powód wyciszenia").setRequired(false),
          )
          .addString("duration", (duration) =>
            duration.setDescription("Nowy czas trwania wyciszenia").setRequired(false),
          )
          .handle(
            async (
              { db, messageQueue },
              { id, reason, duration: rawDuration },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (!reason && !rawDuration) {
                await errorFollowUp(
                  itx,
                  "Podaj nowy powód lub czas trwania wyciszenia",
                );
                return;
              }

              const mute = await db.transaction(async (tx) => {
                const [mute] = await getMute(tx, id, itx.guildId);
                if (!mute) {
                  await errorFollowUp(itx, "Nie znaleziono wyciszenia o podanym ID");
                  return null;
                }
                const originalReason = mute.reason;
                const originalDuration = intervalToDuration({
                  start: mute.createdAt,
                  end: mute.endsAt,
                });

                // null - parsing failed, undefined - no duration provided
                const duration = rawDuration ? parseDuration(rawDuration) : undefined;
                if (duration === null) {
                  await errorFollowUp(
                    itx,
                    "Nieprawidłowy format czasu. Przykłady: `1d`, `8h`, `30m`, `1s`",
                  );
                  return null;
                }

                const updates: Partial<typeof schema.mute.$inferInsert> = {};
                if (reason) updates.reason = reason;
                if (duration) updates.endsAt = add(mute.createdAt, duration);

                // TODO: Save a log of this edit in the database
                const [updatedMute] = await tx
                  .update(schema.mute)
                  .set(updates)
                  .where(eq(schema.mute.id, id))
                  .returning();

                if (!updatedMute) return null;

                if (duration) {
                  await messageQueue.updateDelay(
                    "muteEnd",
                    updatedMute.id.toString(),
                    durationToSeconds(duration),
                  );
                }

                const member = itx.guild.members.cache.get(mute.userId);
                if (member) {
                  let content = `Twoje wyciszenie zostało zedytowane przez ${userMention(
                    itx.user.id,
                  )} (${itx.user.tag}).`;
                  if (reason) {
                    content += `\n\nPoprzedni powód wyciszenia: ${italic(
                      originalReason,
                    )}\nNowy powód wyciszenia: ${italic(reason)}`;
                  }
                  if (duration) {
                    content += `\n\nPoprzednia długość kary: ${bold(
                      formatDuration(originalDuration),
                    )}\nNowa długość kary: ${bold(formatDuration(duration))}`;
                  }
                  await sendDirectMessage(member.user, content);
                }

                return updatedMute;
              });
              if (!mute) return;

              await itx.editReply(
                `Zaktualizowano wyciszenie ${inlineCode(id.toString())}. `
                  .concat(reason ? `\nNowy powód: ${italic(reason)}` : "")
                  .concat(
                    rawDuration
                      ? `\nKoniec: ${time(mute.endsAt, TimestampStyles.RelativeTime)}`
                      : "",
                  ),
              );
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
              isNull(schema.mute.deletedAt),
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
                  endsAt: schema.mute.endsAt,
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
              ({ id, createdAt, reason, userId, moderatorId, endsAt }, _) =>
                `### ${userMention(moderatorId)} ${time(
                  createdAt,
                  TimestampStyles.ShortDateTime,
                )} [${id}]\nUżytkownik: ${userMention(userId)}\nPowód: ${italic(
                  reason,
                )}\nKoniec: ${time(endsAt, TimestampStyles.RelativeTime)}`,
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
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false),
          )
          .handle(async ({ db }, { user: selectedUser, deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const user = selectedUser ?? itx.user;
            const muteWheres = and(
              eq(schema.mute.guildId, itx.guildId),
              eq(schema.mute.userId, user.id),
              deleted ? undefined : isNull(schema.mute.deletedAt),
            );
            const paginate = new Paginate({
              orderByColumn: schema.mute.createdAt,
              orderBy: "DESC",
              select: db.select().from(schema.mute).where(muteWheres).$dynamic(),
              count: db
                .select({ count: count() })
                .from(schema.mute)
                .where(muteWheres)
                .$dynamic(),
            });

            const paginatedView = new PaginatedView(
              paginate,
              `Wyciszenia ${user.tag}`,
              formatMuteInList,
              true,
            );
            await paginatedView.render(itx);
          }),
      ),
  )
  .handle("guildMemberAdd", async ({ db, getMuteRoleId }, member) => {
    const activeMute = await db.query.mute.findFirst({
      where: and(
        eq(schema.mute.guildId, member.guild.id),
        eq(schema.mute.userId, member.id),
        isNull(schema.mute.deletedAt),
        gte(schema.mute.endsAt, new Date()),
      ),
    });
    if (!activeMute) return;

    const muteRoleId = await getMuteRoleId(member.guild.id);
    if (!muteRoleId) return;
    await member.roles.add(muteRoleId, `Przywrócone wyciszenie [${activeMute.id}]`);
  });
