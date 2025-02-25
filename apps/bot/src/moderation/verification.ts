import { Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type PrismaTransaction,
  VerificationLevel,
  VerificationStatus,
  VerificationType,
} from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { addSeconds } from "date-fns";
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  type User,
  channelMention,
  inlineCode,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { STRATA_CZASU } from "../specializedConstants";
import { discordTry } from "../util/discordTry";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import {
  applyMute,
  cancelVerificationReminders,
  formatBanReason,
  formatUserWithId,
  getMuteRoleId,
  removeMute,
  scheduleVerificationReminders,
  sendVerificationFailedMessage,
} from "./util";

const get16PlusVerificationEnd = (createdAt: Date) => {
  return addSeconds(createdAt, STRATA_CZASU.VERIFICATION_DURATION);
};

const satisfiesVerificationLevel = (
  level: VerificationLevel | null,
  target: VerificationLevel,
) => {
  if (level === null) return false;
  if (target === null) return true;
  const levels = { plus13: 0, plus16: 1, plus18: 2 };
  return levels[level] >= levels[target];
};

export const formatVerificationType = (type: VerificationLevel | null) => {
  switch (type) {
    case "plus13":
      return "13+";
    case "plus16":
      return "16+";
    case "plus18":
      return "18+";
    default:
      return "Brak";
  }
};

const getActive16PlusVerification = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
) =>
  prisma.verification.findFirst({
    where: { guildId, userId, type: "plus16", status: "in_progress" },
  });

const get18PlusRoleId = async (prisma: ExtendedPrismaClient, guildId: string) => {
  const settings = await prisma.guildSettings.findFirst({ where: { guildId } });
  if (!settings) return null;
  return settings.plus18RoleId;
};

const readMember = async (itx: ChatInputCommandInteraction<"cached">, user: User) => {
  return discordTry(
    async () => itx.guild.members.fetch(user.id),
    [RESTJSONErrorCodes.UnknownMember],
    async () => null,
  );
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
          .handle(async ({ prisma, messageQueue }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const member = await readMember(itx, user);
            if (!member)
              return errorFollowUp(itx, "Nie znaleziono użytkownika na serwerze");

            await ensureUsersExist(prisma, [member, itx.user]);
            const dbUser = await prisma.user.findFirst({ where: { id: member.id } });
            if (!dbUser) return;

            if (satisfiesVerificationLevel(dbUser.verificationLevel, "plus16")) {
              return await errorFollowUp(
                itx,
                `${userMention(member.id)} ma już weryfikację ${formatVerificationType(
                  dbUser.verificationLevel,
                )}`,
              );
            }

            const verificationInProgress = await getActive16PlusVerification(
              prisma,
              itx.guildId,
              member.id,
            );
            if (verificationInProgress) {
              return await errorFollowUp(
                itx,
                `${userMention(
                  member.id,
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

            const muteRoleId = await getMuteRoleId(prisma, itx.guildId);
            if (!muteRoleId) {
              await errorFollowUp(
                itx,
                "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
              );
              return;
            }

            // Create verification and try to add the mute role
            // If adding the role fails, rollback the transaction
            const verification = await prisma.$transaction(async (tx) => {
              const verification = await tx.verification.create({
                data: {
                  guildId: itx.guildId,
                  userId: member.id,
                  moderatorId: itx.user.id,
                  type: "plus16",
                  status: "in_progress",
                },
              });

              const appliedMute = await applyMute(
                member,
                muteRoleId,
                `Weryfikacja 16+, moderator: ${itx.user.tag} (${itx.user.id})`,
              );
              if (!appliedMute) {
                await errorFollowUp(
                  itx,
                  "Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.",
                );

                throw new Error(`Failed to apply mute role to ${member.id}`);
              }
              return verification;
            });
            if (!verification) return;

            await messageQueue.push(
              "verificationEnd",
              { verificationId: verification.id },
              STRATA_CZASU.VERIFICATION_DURATION,
              verification.id.toString(),
            );
            await scheduleVerificationReminders(messageQueue, verification.id);

            const sentMessage = await sendDirectMessage(
              member,
              `Hejka ${userMention(
                member.id,
              )}! Na podstawie Twojego zachowania na serwerze lub którejś z Twoich wiadomości uznaliśmy, że **możesz mieć mniej niż 16 lat**. Dlatego przed chwilą jedna z osób z administracji (${userMention(
                itx.user.id,
              )}) **rozpoczęła weryfikację Twojego wieku**.\n\n**Masz teraz 72 godziny na otwarcie ticketa na kanale \`#wyslij-ticket\`: ${channelMention(
                STRATA_CZASU.TICKETS_CHANNEL_ID,
              )}** (musisz kliknąć przycisk "Wiek"). Po utworzeniu ticketa musisz przejść pozytywnie przez proces weryfikacji. Najczęściej sprowadza się to do wysłania jednego zdjęcia. Instrukcje co masz wysłać znajdziesz w na kanale z linka. Brak weryfikacji w ciągu 72 godzin **zakończy się banem**, dlatego proszę nie ignoruj tej wiadomości. Pozdrawiam!`,
            );

            await itx.editReply(
              `Rozpoczęto weryfikację 16+ dla ${userMention(member.id)}`,
            );
            if (!sentMessage) {
              await errorFollowUp(
                itx,
                `Nie udało się wysłać wiadomości do ${formatUserWithId(member)}.`,
              );
            }
          }),
      )
      .addCommand("lista", (command) =>
        command
          .setDescription("Sprawdź aktywne weryfikacje")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            const where = {
              guildId: itx.guildId,
              type: VerificationType.plus16,
              status: VerificationStatus.in_progress,
            };

            const paginate = new DatabasePaginator(
              (props, createdAt) =>
                prisma.verification.findMany({
                  where,
                  ...props,
                  orderBy: { createdAt },
                }),
              () => prisma.verification.count({ where }),
              { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
            );

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
                { name: "16+", value: VerificationLevel.plus16 },
                { name: "18+", value: VerificationLevel.plus18 },
              ),
          )
          .handle(async ({ prisma, messageQueue }, { user, type: rawType }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const verificationType = rawType as VerificationLevel;

            await ensureUsersExist(prisma, [user, itx.user]);
            const dbUser = await prisma.user.findFirst({ where: { id: user.id } });
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
            const active16PlusVerification = await prisma.$transaction(async (tx) => {
              // Check for an active 16_plus verification even when accepting a 18_plus verification
              const active16PlusVerification = await getActive16PlusVerification(
                tx,
                itx.guildId,
                user.id,
              );
              if (active16PlusVerification) {
                await tx.verification.update({
                  where: { id: active16PlusVerification.id },
                  data: { status: "accepted", acceptedAt: itx.createdAt },
                });

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
                await tx.verification.create({
                  data: {
                    createdAt: itx.createdAt,
                    acceptedAt: itx.createdAt,
                    guildId: itx.guildId,
                    userId: user.id,
                    moderatorId: itx.user.id,
                    type: "plus16",
                    status: "accepted",
                  },
                });
              }

              if (verificationType === "plus18") {
                await tx.verification.create({
                  data: {
                    createdAt: itx.createdAt,
                    acceptedAt: itx.createdAt,
                    guildId: itx.guildId,
                    userId: user.id,
                    moderatorId: itx.user.id,
                    type: "plus18",
                    status: "accepted",
                  },
                });
              }

              await tx.user.update({
                where: { id: user.id },
                data: { verificationLevel: verificationType },
              });

              return active16PlusVerification;
            });

            // Try to remove the mute role if the verification was in progress and there is no active mute
            const activeMute = await prisma.mute.findFirst({
              where: {
                guildId: itx.guildId,
                userId: user.id,
                endsAt: { gte: itx.createdAt },
                deletedAt: null,
              },
            });
            const shouldRemoveMute = active16PlusVerification && !activeMute;
            let muteRemovalFailed = false;
            if (shouldRemoveMute) {
              muteRemovalFailed = await discordTry(
                async () => {
                  const muteRoleId = await getMuteRoleId(prisma, itx.guildId);
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
            if (verificationType === "plus18") {
              const plus18RoleId = await get18PlusRoleId(prisma, itx.guildId);
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
            if (verificationType === "plus16" && shouldRemoveMute) {
              // any -> 16_plus with an active verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Twój mute został usunięty i od teraz będziemy jako administracja wiedzieć, że masz ukończone 16 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else if (verificationType === "plus16" && !shouldRemoveMute) {
              // any -> 16_plus with an active verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Od teraz będziemy jako administracja wiedzieć, że masz ukończone 16 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else if (verificationType === "plus18" && shouldRemoveMute) {
              // any -> 18_plus with an active verification
              directMessageContent = `Hej ${userMention(
                user.id,
              )}! To znowu ja. Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**. Twój mute został usunięty i od teraz będziemy jako administracja wiedzieć, że masz ukończone 18 lat i nie będziemy Cię w przyszłości weryfikować ponownie. Dodatkowo z uwagi na Twój wiek dałem Ci też rolę \`18+\` dzięki której uzyskałeś dostęp do kilku dodatkowych kanałów na serwerze, m.in do \`#rozmowy-niesforne\`. Życzę Ci miłego dnia i jeszcze raz pozdrawiam!`;
            } else if (verificationType === "plus18" && !shouldRemoveMute) {
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
            if (verificationType === "plus18" && plus18RoleAdditionFailed) {
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
          .handle(async ({ prisma, messageQueue }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUsersExist(prisma, [user, itx.user]);
            const dbUser = await prisma.user.findFirst({ where: { id: user.id } });
            if (!dbUser) return;

            const verificationInProgress = await getActive16PlusVerification(
              prisma,
              itx.guildId,
              user.id,
            );
            if (verificationInProgress) {
              await prisma.verification.update({
                where: { id: verificationInProgress.id },
                data: { status: "rejected", rejectedAt: itx.createdAt },
              });

              await messageQueue.cancel(
                "verificationEnd",
                verificationInProgress.id.toString(),
              );
              await cancelVerificationReminders(
                messageQueue,
                verificationInProgress.id,
              );
            } else {
              await prisma.verification.create({
                data: {
                  createdAt: itx.createdAt,
                  rejectedAt: itx.createdAt,
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  type: "plus16",
                  status: "rejected",
                },
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
      )
      .addCommand("wycofaj", (command) =>
        command
          .setDescription("Wycofaj weryfikację, jeśli przypadkowo została rozpoczęta")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ prisma, messageQueue }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const member = await readMember(itx, user);
            if (!member)
              return errorFollowUp(itx, "Nie znaleziono użytkownika na serwerze");

            await ensureUsersExist(prisma, [member, itx.user]);

            const result = await prisma.$transaction(async (tx) => {
              const verificationInProgress = await getActive16PlusVerification(
                tx,
                itx.guildId,
                member.id,
              );

              if (!verificationInProgress)
                return { status: "not_in_progress" as const };

              await prisma.verification.update({
                where: { id: verificationInProgress.id },
                data: { status: "cancelled", cancelledAt: itx.createdAt },
              });

              await messageQueue.cancel(
                "verificationEnd",
                verificationInProgress.id.toString(),
              );

              const muteRoleId = await getMuteRoleId(prisma, itx.guildId);
              if (!muteRoleId) return { status: "mute_role_not_set" as const };
              return { status: "success" as const, muteRoleId };
            });

            if (result.status === "not_in_progress") {
              return errorFollowUp(
                itx,
                `${userMention(member.id)} nie jest w trakcie weryfikacji 16+`,
              );
            }

            if (result.status === "mute_role_not_set") {
              return errorFollowUp(
                itx,
                "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
              );
            }

            await removeMute(member, result.muteRoleId, "Wycofanie weryfikacji 16+");

            await itx.editReply(
              `Wycofano weryfikację 16+ dla ${userMention(member.id)}`,
            );
          }),
      ),
  )
  .command("kartoteka", (command) =>
    command
      .setDescription("Sprawdź kartotekę użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ prisma }, { user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUserExists(prisma, user);
        const dbUser = await prisma.user.findFirst({ where: { id: user.id } });
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
  )
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const verificationInProgress = await getActive16PlusVerification(
      prisma,
      member.guild.id,
      member.id,
    );
    if (!verificationInProgress) return;

    const muteRoleId = await getMuteRoleId(prisma, member.guild.id);
    if (!muteRoleId) return;

    await applyMute(
      member,
      muteRoleId,
      `Przywrócone wyciszenie (weryfikacja 16+) [${verificationInProgress.id}]`,
    );
  });
