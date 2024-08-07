import { type ExtractContext, Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { and, count, eq, gte, isNull } from "@hashira/db/drizzle";
import { PaginatorOrder } from "@hashira/paginate";
import { type Duration, add } from "date-fns";
import {
  EmbedBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  channelMention,
  inlineCode,
  time,
  userMention,
} from "discord.js";
import { match } from "ts-pattern";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { durationToSeconds } from "../util/duration";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import {
  applyMute,
  cancelVerificationReminders,
  formatBanReason,
  formatUserWithId,
  getMuteRoleId,
  scheduleVerificationReminders,
  sendVerificationFailedMessage,
} from "./util";

const TICKETS_CHANNEL = "1213901611836117052" as const;
const VERIFICATION_DURATION: Duration = { hours: 72 } as const;
type BaseContext = ExtractContext<typeof base>;

const get16PlusVerificationEnd = (createdAt: Date) => {
  return add(createdAt, VERIFICATION_DURATION);
};

type VerificationLevel = typeof schema.user.$inferSelect.verificationLevel;
const satisfiesVerificationLevel = (
  level: VerificationLevel,
  target: VerificationLevel,
) => {
  if (level === null) return false;
  if (target === null) return true;
  const levels = { "13_plus": 0, "16_plus": 1, "18_plus": 2 };
  return levels[level] >= levels[target];
};

const formatVerificationType = (type: VerificationLevel) => {
  return match(type)
    .with("13_plus", () => "13+")
    .with("16_plus", () => "16+")
    .with("18_plus", () => "18+")
    .with(null, () => "Brak")
    .exhaustive();
};

const getActive16PlusVerification = async (
  db: BaseContext["db"],
  guildId: string,
  userId: string,
) =>
  db.query.verification.findFirst({
    where: and(
      eq(schema.verification.guildId, guildId),
      eq(schema.verification.userId, userId),
      eq(schema.verification.type, "16_plus"),
      eq(schema.verification.status, "in_progress"),
    ),
  });

const get18PlusRoleId = async (db: BaseContext["db"], guildId: string) => {
  const settings = await db.query.guildSettings.findFirst({
    where: eq(schema.guildSettings.guildId, guildId),
  });
  if (!settings) return null;
  return settings.plus18RoleId;
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
          .setDescription("Rozpocznij weryfikację 16+")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          // TODO)) Add `force` parameter to start verification even if the user has a verification level
          .handle(async ({ db, messageQueue }, { user }, itx) => {
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

            if (satisfiesVerificationLevel(dbUser.verificationLevel, "16_plus")) {
              return await errorFollowUp(
                itx,
                `${userMention(user.id)} ma już weryfikację ${formatVerificationType(
                  dbUser.verificationLevel,
                )}`,
              );
            }

            const verificationInProgress = await getActive16PlusVerification(
              db,
              itx.guildId,
              user.id,
            );
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
                  get16PlusVerificationEnd(verificationInProgress.createdAt),
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
              const [verification] = await tx
                .insert(schema.verification)
                .values({
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  type: "16_plus",
                  status: "in_progress",
                })
                .returning({ id: schema.verification.id });
              const appliedMute = applyMute(
                member,
                muteRoleId,
                `Weryfikacja 16+, moderator: ${itx.user.tag} (${itx.user.id})`,
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

            await messageQueue.push(
              "verificationEnd",
              { verificationId: verification.id },
              durationToSeconds(VERIFICATION_DURATION),
              verification.id.toString(),
            );
            await scheduleVerificationReminders(messageQueue, verification.id);

            const sentMessage = await sendDirectMessage(
              user,
              `Hejka ${userMention(
                user.id,
              )}! Na podstawie Twojego zachowania na serwerze lub którejś z Twoich wiadomości uznaliśmy, że **możesz mieć mniej niż 16 lat**. Dlatego przed chwilą jedna z osób z administracji (${userMention(
                itx.user.id,
              )}) **rozpoczęła weryfikację Twojego wieku**.\n\n**Masz teraz 72 godziny na otwarcie ticketa na kanale \`#wyslij-ticket\`: ${channelMention(
                TICKETS_CHANNEL,
              )}** (musisz kliknąć przycisk "Wiek"). Po utworzeniu ticketa musisz przejść pozytywnie przez proces weryfikacji. Najczęściej sprowadza się to do wysłania jednego zdjęcia. Instrukcje co masz wysłać znajdziesz w na kanale z linka. Brak weryfikacji w ciągu 72 godzin **zakończy się banem**, dlatego proszę nie ignoruj tej wiadomości. Pozdrawiam!`,
            );

            await itx.editReply(
              `Rozpoczęto weryfikację 16+ dla ${userMention(user.id)}`,
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
              eq(schema.verification.type, "16_plus"),
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
              "Aktywne weryfikacje 16+",
              ({ createdAt, userId, moderatorId }) =>
                `### ${userMention(userId)} (${inlineCode(userId)})\nModerator: ${userMention(moderatorId)}\nData rozpoczęcia: ${time(createdAt, TimestampStyles.ShortDateTime)}\nKoniec: ${time(
                  get16PlusVerificationEnd(createdAt),
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
          .addString("type", (type) =>
            type
              .setDescription("Typ weryfikacji")
              .addChoices(
                { name: "16+", value: "16_plus" },
                { name: "18+", value: "18_plus" },
              ),
          )
          .handle(async ({ db, messageQueue }, { user, type: rawType }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const verificationType = rawType as VerificationLevel;

            await ensureUsersExist(db, [user, itx.user]);
            const dbUser = await db.query.user.findFirst({
              where: eq(schema.user.id, user.id),
            });
            if (!dbUser) return;

            if (
              satisfiesVerificationLevel(dbUser.verificationLevel, verificationType)
            ) {
              return await errorFollowUp(
                itx,
                `${userMention(user.id)} ma już weryfikację ${formatVerificationType(
                  verificationType,
                )}`,
              );
            }

            const currentVerificationLevel = dbUser.verificationLevel;
            const active16PlusVerification = await db.transaction(async (tx) => {
              // Check for an active 16_plus verification even when accepting a 18_plus verification
              const active16PlusVerification = await getActive16PlusVerification(
                tx,
                itx.guildId,
                user.id,
              );
              if (active16PlusVerification) {
                await tx
                  .update(schema.verification)
                  .set({ status: "accepted", acceptedAt: itx.createdAt })
                  .where(eq(schema.verification.id, active16PlusVerification.id));
                await messageQueue.cancel(
                  "verificationEnd",
                  active16PlusVerification.id.toString(),
                );
                await cancelVerificationReminders(
                  messageQueue,
                  active16PlusVerification.id,
                );
              } else if (currentVerificationLevel === null) {
                // Create a 16_plus verification if there is no active verification.
                await tx.insert(schema.verification).values({
                  createdAt: itx.createdAt,
                  acceptedAt: itx.createdAt,
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  type: "16_plus",
                  status: "accepted",
                });
              }

              if (verificationType === "18_plus") {
                await tx.insert(schema.verification).values({
                  createdAt: itx.createdAt,
                  acceptedAt: itx.createdAt,
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  type: "18_plus",
                  status: "accepted",
                });
              }

              await tx
                .update(schema.user)
                .set({ verificationLevel: verificationType })
                .where(eq(schema.user.id, user.id));
              return active16PlusVerification;
            });

            // Try to remove the mute role if the verification was in progress and there is no active mute
            const activeMute = await db.query.mute.findFirst({
              where: and(
                eq(schema.mute.guildId, itx.guildId),
                eq(schema.mute.userId, user.id),
                isNull(schema.mute.deletedAt),
                gte(schema.mute.endsAt, itx.createdAt),
              ),
            });
            const shouldRemoveMute = active16PlusVerification && !activeMute;
            let muteRemovalFailed = false;
            if (shouldRemoveMute) {
              muteRemovalFailed = await discordTry(
                async () => {
                  const muteRoleId = await getMuteRoleId(db, itx.guildId);
                  if (!muteRoleId) return true;
                  const member = await itx.guild.members.fetch(user.id);
                  await member.roles.remove(
                    muteRoleId,
                    `Weryfikacja 16+ przyjęta przez ${itx.user.tag} (${itx.user.id})`,
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

            let plus18RoleAdditionFailed = false;
            if (verificationType === "18_plus") {
              const plus18RoleId = await get18PlusRoleId(db, itx.guildId);
              if (plus18RoleId) {
                plus18RoleAdditionFailed = await discordTry(
                  async () => {
                    const member = await itx.guild.members.fetch(user.id);
                    await member.roles.add(
                      plus18RoleId,
                      `Weryfikacja 18+ przyjęta przez ${itx.user.tag} (${itx.user.id})`,
                    );
                    return false;
                  },
                  [
                    RESTJSONErrorCodes.UnknownMember,
                    RESTJSONErrorCodes.MissingPermissions,
                  ],
                  () => false,
                );
              }
            }

            let directMessageContent: string;
            if (verificationType === "16_plus" && shouldRemoveMute) {
              // any -> 16_plus with an active verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Twój mute został usunięty i od teraz będziemy jako administracja wiedzieć, że masz ukończone 16 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else if (verificationType === "16_plus" && !shouldRemoveMute) {
              // any -> 16_plus with an active verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Od teraz będziemy jako administracja wiedzieć, że masz ukończone 16 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else if (verificationType === "18_plus" && shouldRemoveMute) {
              // any -> 18_plus with an active verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Twój mute został usunięty i od teraz będziemy jako administracja wiedzieć, że masz ukończone 18 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Dodatkowo z uwagi na Twój wiek dałem Ci też rolę \`18+\` dzięki której uzyskałeś dostęp do kilku dodatkowych kanałów na serwerze, m.in do \`#rozmowy-niesforne\`. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else if (verificationType === "18_plus" && !shouldRemoveMute) {
              // null -> 18_plus without starting a 16_plus verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Od teraz będziemy jako administracja wiedzieć, że masz ukończone 18 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Dodatkowo z uwagi na Twój wiek dałem Ci też rolę \`18+\` dzięki której uzyskałeś dostęp do kilku dodatkowych kanałów na serwerze, m.in do \`#rozmowy-niesforne\`. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else {
              throw new Error(
                `Invalid verification transition from ${currentVerificationLevel} to ${verificationType}`,
              );
            }
            const sentMessage = await sendDirectMessage(user, directMessageContent);

            await itx.editReply(
              `Przyjęto weryfikację ${formatVerificationType(
                verificationType,
              )} dla ${userMention(user.id)}`,
            );
            if (shouldRemoveMute && muteRemovalFailed) {
              await errorFollowUp(
                itx,
                `Nie udało się usunąć roli wyciszenia dla ${formatUserWithId(user)}.`,
              );
            }
            if (verificationType === "18_plus" && plus18RoleAdditionFailed) {
              await errorFollowUp(
                itx,
                `Nie udało się dodać roli 18+ dla ${formatUserWithId(user)}.`,
              );
            }
            if (!sentMessage) {
              await errorFollowUp(
                itx,
                `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`,
              );
            }
          }),
      )
      .addCommand("odrzuc", (command) =>
        command
          .setDescription("Odrzuć weryfikację 16+")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ db, messageQueue }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUsersExist(db, [user, itx.user]);
            const dbUser = await db.query.user.findFirst({
              where: eq(schema.user.id, user.id),
            });
            if (!dbUser) return;

            const verificationInProgress = await getActive16PlusVerification(
              db,
              itx.guildId,
              user.id,
            );
            if (verificationInProgress) {
              await db
                .update(schema.verification)
                .set({ status: "rejected", rejectedAt: itx.createdAt })
                .where(eq(schema.verification.id, verificationInProgress.id));
              await messageQueue.cancel(
                "verificationEnd",
                verificationInProgress.id.toString(),
              );
              await cancelVerificationReminders(
                messageQueue,
                verificationInProgress.id,
              );
            } else {
              await db.insert(schema.verification).values({
                createdAt: itx.createdAt,
                rejectedAt: itx.createdAt,
                guildId: itx.guildId,
                userId: user.id,
                moderatorId: itx.user.id,
                type: "16_plus",
                status: "rejected",
              });
            }

            const sentMessage = await sendVerificationFailedMessage(user);
            const banned = await discordTry(
              async () => {
                let baseReason = "Nieudana weryfikacja 16+";
                if (verificationInProgress) {
                  baseReason += ` [${verificationInProgress.id}]`;
                }
                const reason = formatBanReason(baseReason, itx.user, itx.createdAt);
                await itx.guild.bans.create(user, { reason });
                return true;
              },
              [RESTJSONErrorCodes.MissingPermissions],
              () => false,
            );

            await itx.editReply(
              `Odrzucono weryfikację 16+ dla ${userMention(user.id)}`,
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
        const isInGuild = member !== null;

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
              value: formatVerificationType(dbUser.verificationLevel),
            },
            {
              name: "Na serwerze?",
              value: isInGuild ? "Tak" : "Nie",
            },
          );
        if (isInGuild && member.joinedAt) {
          embed.addFields({
            name: "Data dołączenia na serwer",
            value: time(member.joinedAt, TimestampStyles.ShortDateTime),
          });
        }
        await itx.editReply({ embeds: [embed] });
      }),
  );
