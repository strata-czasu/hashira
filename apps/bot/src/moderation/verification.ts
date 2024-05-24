import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { and, count, eq, gte, isNull } from "@hashira/db/drizzle";
import { PaginatorOrder } from "@hashira/paginate";
import { add } from "date-fns";
import {
  EmbedBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  channelMention,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { applyMute, formatBanReason, formatUserWithId, getMuteRoleId } from "./util";

const TICKETS_CHANNEL = "1213901611836117052";

const get13PlusVerificationEnd = (createdAt: Date) => {
  return add(createdAt, { hours: 24 });
};

export const verification = new Hashira({ name: "verification" })
  .use(base)
  .group("weryfikacja", (group) =>
    group
      .setDescription("Weryfikacja użytkowników")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("rozpocznij", (command) =>
        command
          .setDescription("Rozpocznij weryfikację 13+")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          // TODO)) Add `force` parameter to start verification even if the user has a verification level
          .handle(async ({ db }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const member = await discordTry(
              async () => itx.guild.members.fetch(user.id),
              [RESTJSONErrorCodes.UnknownMember],
              async () => {
                await errorFollowUp(itx, "Nie znaleziono użytkownika na serwerze");
                return null;
              },
            );
            if (!member) return;

            await ensureUsersExist(db, [user, itx.user]);
            const dbUser = await db.query.user.findFirst({
              where: eq(schema.user.id, user.id),
            });
            if (!dbUser) return;

            if (dbUser.verificationLevel === "13_plus") {
              return await errorFollowUp(
                itx,
                `${userMention(user.id)} ma już weryfikację 13+`,
              );
            }
            if (dbUser.verificationLevel === "18_plus") {
              return await errorFollowUp(
                itx,
                `${userMention(user.id)} ma już weryfikację 18+`,
              );
            }

            const verificationInProgress = await db.query.verification.findFirst({
              where: and(
                eq(schema.verification.guildId, itx.guildId),
                eq(schema.verification.userId, user.id),
                eq(schema.verification.status, "in_progress"),
              ),
            });
            if (verificationInProgress) {
              return await errorFollowUp(
                itx,
                `${userMention(
                  user.id,
                )} jest już w trakcie weryfikacji przez ${userMention(
                  verificationInProgress.moderatorId,
                )}\nData rozpoczęcia: ${time(
                  verificationInProgress.createdAt,
                  TimestampStyles.ShortDateTime,
                )}\nKoniec: ${time(
                  get13PlusVerificationEnd(verificationInProgress.createdAt),
                  TimestampStyles.RelativeTime,
                )}`,
              );
            }

            const muteRoleId = await getMuteRoleId(db, itx.guildId);
            if (!muteRoleId) {
              await errorFollowUp(
                itx,
                "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
              );
              return;
            }

            // Create verification and try to add the mute role
            // If adding the role fails, rollback the transaction
            const verification = await db.transaction(async (tx) => {
              const verification = await tx.insert(schema.verification).values({
                guildId: itx.guildId,
                userId: user.id,
                moderatorId: itx.user.id,
                type: "13_plus",
                status: "in_progress",
              });
              const appliedMute = applyMute(
                member,
                muteRoleId,
                `Weryfikacja 13+, moderator: ${itx.user.tag} (${itx.user.id})`,
              );
              if (!appliedMute) {
                await errorFollowUp(
                  itx,
                  "Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.",
                );
                tx.rollback();
                return null;
              }
              return verification;
            });
            if (!verification) return;

            // TODO)) Schedule a notification for the moderator that the verification time is up

            // TODO)) Update DM
            const sentMessage = await sendDirectMessage(
              user,
              `Hejka! Przed chwilą ${userMention(itx.user.id)} (${
                itx.user.tag
              }) rozpoczął Ci weryfikację wieku 13+.\n\nAby zweryfikować swój wiek, otwórz ticket na kanale ${channelMention(
                TICKETS_CHANNEL,
              )} klikając przycisk ":underage: Wiek".\nNa zweryfikowanie swojego wieku masz 24 godziny. Podczas jej trwania zabrałem Ci możliwość pisania na serwerze.`,
            );

            await itx.editReply(
              `Rozpoczęto weryfikację 13+ dla ${userMention(user.id)}`,
            );
            if (!sentMessage) {
              await errorFollowUp(
                itx,
                `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
              );
            }
          }),
      )
      .addCommand("lista", (command) =>
        command
          .setDescription("Sprawdź aktywne weryfikacje")
          .handle(async ({ db }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const wheres = and(
              eq(schema.verification.guildId, itx.guildId),
              eq(schema.verification.type, "13_plus"),
              eq(schema.verification.status, "in_progress"),
            );
            const paginate = new DatabasePaginator({
              orderBy: schema.verification.createdAt,
              ordering: PaginatorOrder.DESC,
              select: db
                .select({
                  id: schema.verification.id,
                  createdAt: schema.verification.createdAt,
                  userId: schema.verification.userId,
                  moderatorId: schema.verification.moderatorId,
                })
                .from(schema.verification)
                .where(wheres)
                .$dynamic(),
              count: db
                .select({ count: count() })
                .from(schema.verification)
                .where(wheres)
                .$dynamic(),
            });

            const paginatedView = new PaginatedView(
              paginate,
              "Aktywne weryfikacje 13+",
              ({ id, createdAt, userId, moderatorId }) =>
                `### ${userMention(moderatorId)} ${time(
                  createdAt,
                  TimestampStyles.ShortDateTime,
                )} [${id}]\nUżytkownik: ${userMention(userId)}\nKoniec: ${time(
                  get13PlusVerificationEnd(createdAt),
                  TimestampStyles.RelativeTime,
                )}`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("przyjmij", (command) =>
        command
          .setDescription("Przyjmij weryfikację")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addInteger("type", (type) =>
            type
              .setDescription("Typ weryfikacji")
              .addChoices({ name: "13+", value: 13 }, { name: "18+", value: 18 }),
          )
          .handle(async ({ db }, { user, type }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUsersExist(db, [user, itx.user]);
            const dbUser = await db.query.user.findFirst({
              where: eq(schema.user.id, user.id),
            });
            if (!dbUser) return;

            if (type === 13) {
              if (dbUser.verificationLevel && dbUser.verificationLevel === "13_plus") {
                return await errorFollowUp(
                  itx,
                  `${userMention(user.id)} ma już weryfikację 13+`,
                );
              }
              if (dbUser.verificationLevel && dbUser.verificationLevel === "18_plus") {
                return await errorFollowUp(
                  itx,
                  `${userMention(user.id)} ma już weryfikację 18+`,
                );
              }

              const verificationInProgress = await db.query.verification.findFirst({
                where: and(
                  eq(schema.verification.guildId, itx.guildId),
                  eq(schema.verification.userId, user.id),
                  eq(schema.verification.type, "13_plus"),
                  eq(schema.verification.status, "in_progress"),
                ),
              });

              await db.transaction(async (tx) => {
                await tx
                  .update(schema.user)
                  .set({ verificationLevel: "13_plus" })
                  .where(eq(schema.user.id, user.id));
                if (verificationInProgress) {
                  await tx
                    .update(schema.verification)
                    .set({ status: "accepted", acceptedAt: itx.createdAt })
                    .where(eq(schema.verification.id, verificationInProgress.id));
                } else {
                  await tx.insert(schema.verification).values({
                    createdAt: itx.createdAt,
                    acceptedAt: itx.createdAt,
                    guildId: itx.guildId,
                    userId: user.id,
                    moderatorId: itx.user.id,
                    type: "13_plus",
                    status: "accepted",
                  });
                }
              });

              // TODO)) Delete the scheduled notification for the moderator

              // Try to remove the mute role if the verification was in progress and there is no active mute
              const activeMute = await db.query.mute.findFirst({
                where: and(
                  eq(schema.mute.guildId, itx.guildId),
                  eq(schema.mute.userId, user.id),
                  isNull(schema.mute.deletedAt),
                  gte(schema.mute.endsAt, itx.createdAt),
                ),
              });
              const shouldRemoveMuteRole = verificationInProgress && !activeMute;
              let muteRemovalFailed = false;
              if (shouldRemoveMuteRole) {
                muteRemovalFailed = await discordTry(
                  async () => {
                    const muteRoleId = await getMuteRoleId(db, itx.guildId);
                    if (!muteRoleId) return true;
                    const member = await itx.guild.members.fetch(user.id);
                    await member.roles.remove(
                      muteRoleId,
                      `Weryfikacja 13+ zaakceptowana przez ${itx.user.tag} (${itx.user.id})`,
                    );
                    return false;
                  },
                  [
                    RESTJSONErrorCodes.UnknownMember,
                    RESTJSONErrorCodes.MissingPermissions,
                  ],
                  () => true,
                );
              }

              // TODO)) Update DM
              const sentMessage = await sendDirectMessage(
                user,
                `Gratulacje! Twoja weryfikacja wieku 13+ została zaakceptowana przez ${userMention(
                  itx.user.id,
                )} (${itx.user.tag}).`,
              );

              await itx.editReply(
                `Przyjęto weryfikację 13+ dla ${userMention(user.id)}`,
              );
              if (shouldRemoveMuteRole && muteRemovalFailed) {
                await errorFollowUp(
                  itx,
                  `Nie udało się usunąć roli wyciszenia dla ${formatUserWithId(user)}.`,
                );
              }
              if (!sentMessage) {
                await errorFollowUp(
                  itx,
                  `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
                );
              }
              return;
            }

            if (type === 18) {
              if (dbUser.verificationLevel === "18_plus") {
                return await errorFollowUp(
                  itx,
                  `${userMention(user.id)} ma już weryfikację 18+`,
                );
              }

              const active13PlusVerification = await db.query.verification.findFirst({
                where: and(
                  eq(schema.verification.guildId, itx.guildId),
                  eq(schema.verification.userId, user.id),
                  eq(schema.verification.type, "13_plus"),
                  eq(schema.verification.status, "in_progress"),
                ),
              });
              if (active13PlusVerification) {
                return await errorFollowUp(
                  itx,
                  `${userMention(
                    user.id,
                  )} jest w trakcie weryfikacji 13+. Zakończ ją przed przyjęciem weryfikacji 18+`,
                );
              }

              await db.transaction(async (tx) => {
                await tx
                  .update(schema.user)
                  .set({ verificationLevel: "18_plus" })
                  .where(eq(schema.user.id, user.id));
                await tx.insert(schema.verification).values({
                  createdAt: itx.createdAt,
                  acceptedAt: itx.createdAt,
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  type: "18_plus",
                  status: "accepted",
                });
              });

              await itx.editReply(
                `Przyjęto weryfikację 18+ dla ${userMention(user.id)}`,
              );
              return;
            }

            await errorFollowUp(itx, "Nieznany typ weryfikacji");
          }),
      )
      .addCommand("odrzuc", (command) =>
        command
          .setDescription("Odrzuć weryfikację 13+")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ db }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUsersExist(db, [user, itx.user]);
            const dbUser = await db.query.user.findFirst({
              where: eq(schema.user.id, user.id),
            });
            if (!dbUser) return;

            const verificationInProgress = await db.query.verification.findFirst({
              where: and(
                eq(schema.verification.guildId, itx.guildId),
                eq(schema.verification.userId, user.id),
                eq(schema.verification.type, "13_plus"),
                eq(schema.verification.status, "in_progress"),
              ),
            });
            if (verificationInProgress) {
              await db
                .update(schema.verification)
                .set({ status: "rejected", rejectedAt: itx.createdAt })
                .where(eq(schema.verification.id, verificationInProgress.id));
              // TODO)) Delete the scheduled notification for the moderator
            } else {
              await db.insert(schema.verification).values({
                createdAt: itx.createdAt,
                rejectedAt: itx.createdAt,
                guildId: itx.guildId,
                userId: user.id,
                moderatorId: itx.user.id,
                type: "13_plus",
                status: "rejected",
              });
            }

            // TODO)) Update DM
            const sentMessage = await sendDirectMessage(
              user,
              `Przykro mi, ale Twoja weryfikacja wieku 13+ została odrzucona przez ${userMention(
                itx.user.id,
              )} (${itx.user.tag}).`,
            );

            const banned = await discordTry(
              async () => {
                const member = await itx.guild.members.fetch(user.id);
                const reason = formatBanReason(
                  "Nieudana weryfikacja 13+",
                  itx.user,
                  itx.createdAt,
                );
                await member.ban({ reason });
                return true;
              },
              [RESTJSONErrorCodes.UnknownMember, RESTJSONErrorCodes.MissingPermissions],
              () => false,
            );

            await itx.editReply(
              `Odrzucono weryfikację 13+ dla ${userMention(user.id)}`,
            );
            if (!sentMessage) {
              await errorFollowUp(
                itx,
                `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
              );
            }
            if (!banned) {
              await errorFollowUp(
                itx,
                `Nie udało się zbanować ${formatUserWithId(user)}`,
              );
            }
            return;
          }),
      ),
  )
  .command("kartoteka", (command) =>
    command
      .setDescription("Sprawdź kartotekę użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ db }, { user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUserExists(db, user);
        const dbUser = await db.query.user.findFirst({
          where: eq(schema.user.id, user.id),
        });
        if (!dbUser) return;

        const member = await discordTry(
          async () => itx.guild.members.fetch(user.id),
          [RESTJSONErrorCodes.UnknownMember],
          () => null,
        );
        const isOnGuild = member !== null;

        const embed = new EmbedBuilder()
          .setTitle(`Kartoteka ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `ID: ${user.id}` })
          .addFields(
            {
              name: "Data założenia konta",
              value: time(user.createdAt, TimestampStyles.ShortDateTime),
            },
            {
              name: "Poziom weryfikacji",
              value: dbUser.verificationLevel ?? "Brak",
            },
            {
              name: "Na serwerze?",
              value: isOnGuild ? "Tak" : "Nie",
            },
          );
        if (isOnGuild && member.joinedAt) {
          embed.addFields({
            name: "Data dołączenia na serwer",
            value: time(member.joinedAt, TimestampStyles.ShortDateTime),
          });
        }
        await itx.editReply({ embeds: [embed] });
      }),
  );
