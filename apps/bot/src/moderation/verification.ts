import { type ExtractContext, Hashira, PaginatedView } from "@hashira/core";
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
  type Guild,
  type GuildMember,
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
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";
import {
  applyMute,
  cancelVerificationReminders,
  formatBanReason,
  formatUserWithId,
  getGuildRolesIds,
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

const readMember = async (itx: ChatInputCommandInteraction<"cached">, user: User) => {
  return discordTry(
    async () => itx.guild.members.fetch(user.id),
    [RESTJSONErrorCodes.UnknownMember],
    async () => null,
  );
};

type BaseContext = ExtractContext<typeof base>;

type AcceptVerificationParams = {
  prisma: ExtendedPrismaClient;
  messageQueue: BaseContext["messageQueue"];
  guild: Guild;
  member: GuildMember;
  moderator: GuildMember;
  verificationType: VerificationLevel;
  acceptedAt: Date;
};

type AcceptVerificationResultOk = {
  success: true;
  hadActiveVerification: boolean;
  currentVerificationLevel: VerificationLevel | null;
  shouldRemoveMute: boolean;
};

type AcceptVerificationResultError = {
  success: false;
  error: "user_not_found" | "already_verified";
};

type AcceptVerificationResult =
  | AcceptVerificationResultOk
  | AcceptVerificationResultError;

const acceptVerification = async ({
  prisma,
  messageQueue,
  guild,
  member,
  moderator,
  verificationType,
  acceptedAt,
}: AcceptVerificationParams): Promise<AcceptVerificationResult> => {
  const dbUser = await prisma.user.findFirst({ where: { id: member.id } });

  if (!dbUser) {
    return { success: false, error: "user_not_found" };
  }

  if (satisfiesVerificationLevel(dbUser.verificationLevel, verificationType)) {
    return { success: false, error: "already_verified" };
  }

  const currentVerificationLevel = dbUser.verificationLevel;

  const active16PlusVerification = await prisma.$transaction(async (tx) => {
    const active16PlusVerification = await getActive16PlusVerification(
      tx,
      guild.id,
      member.id,
    );

    if (active16PlusVerification) {
      await tx.verification.update({
        where: { id: active16PlusVerification.id },
        data: { status: "accepted", acceptedAt },
      });

      await messageQueue.cancelTx(
        tx,
        "verificationEnd",
        active16PlusVerification.id.toString(),
      );
      await cancelVerificationReminders(tx, messageQueue, active16PlusVerification.id);
    } else {
      await tx.verification.create({
        data: {
          guildId: guild.id,
          userId: member.id,
          moderatorId: moderator.id,
          type: verificationType,
          status: "accepted",
        },
      });
    }

    await tx.user.update({
      where: { id: member.id },
      data: { verificationLevel: verificationType },
    });

    return {
      hasActiveVerification: active16PlusVerification !== null,
    } as const;
  });

  const activeMute = await prisma.mute.findFirst({
    where: {
      guildId: guild.id,
      userId: member.id,
      endsAt: { gte: acceptedAt },
      deletedAt: null,
    },
  });

  const guildRoles = await getGuildRolesIds(prisma, guild.id);

  if (!activeMute && active16PlusVerification) {
    if (guildRoles.muteRoleId) {
      const muteRoleId = guildRoles.muteRoleId;
      const reason = `Weryfikacja przyjęta (${verificationType}), moderator: ${moderator.id})`;

      await discordTry(
        () => member.roles.remove(muteRoleId, reason),
        [RESTJSONErrorCodes.MissingPermissions, RESTJSONErrorCodes.UnknownMember],
        () =>
          moderator.send(
            `Nie udało się zdjąć roli wyciszenia z ${member.user.tag} po weryfikacji`,
          ),
      );
    }
  }

  if (verificationType === "plus18") {
    if (guildRoles.plus18RoleId) {
      const plus18RoleId = guildRoles.plus18RoleId;
      const reason = `Weryfikacja 18+ przyjęta przez ${moderator.user.tag} (${moderator.id})`;

      await discordTry(
        () => member.roles.add(plus18RoleId, reason),
        [RESTJSONErrorCodes.MissingPermissions, RESTJSONErrorCodes.UnknownMember],
        () =>
          moderator.send(
            `Nie udało się dodać roli 18+ do ${member.user.tag} po weryfikacji`,
          ),
      );
    }
  }

  return {
    success: true,
    hadActiveVerification: active16PlusVerification.hasActiveVerification,
    currentVerificationLevel,
    shouldRemoveMute: !activeMute && active16PlusVerification.hasActiveVerification,
  };
};

const composeSuccessMessage = (
  user: User,
  verificationType: VerificationType,
  { shouldRemoveMute }: AcceptVerificationResultOk,
) => {
  const parts = [
    `Hej ${userMention(user.id)}! Przed chwilą **Twoja weryfikacja wieku została pozytywnie rozpatrzona**.`,
  ];

  if (shouldRemoveMute) {
    parts.push("Twój mute został usunięty.");
  }

  parts.push(
    `Od teraz będziemy jako administracja wiedzieć, że masz ukończone ${verificationType === "plus16" ? "16" : "18"} lat i nie będziemy Cię w przyszłości weryfikować ponownie.`,
  );

  if (verificationType === "plus18") {
    parts.push(
      "Z uwagi na Twój wiek dałem Ci też rolę `18+` dzięki której uzyskałeś dostęp do kilku dodatkowych kanałów na serwerze, m.in do `#rozmowy-niesforne`.",
    );
  }

  parts.push("Miłego dnia!");

  return parts.join(" ");
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

            const guildRoles = await getGuildRolesIds(prisma, itx.guildId);
            if (!guildRoles.muteRoleId) {
              await errorFollowUp(
                itx,
                "Rola do wyciszeń nie jest ustawiona. Użyj komendy `/settings mute-role`",
              );
              return;
            }

            const appliedMute = await applyMute(
              member,
              guildRoles.muteRoleId,
              `Weryfikacja 16+, moderator: ${itx.user.tag} (${itx.user.id})`,
            );

            if (!appliedMute) {
              await errorFollowUp(
                itx,
                "Nie można dodać roli wyciszenia lub rozłączyć użytkownika. Sprawdź uprawnienia bota.",
              );
              return;
            }

            const verification = await prisma.verification.create({
              data: {
                guildId: itx.guildId,
                userId: member.id,
                moderatorId: itx.user.id,
                type: "plus16",
                status: "in_progress",
              },
            });

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

            const member = await readMember(itx, user);
            if (!member) {
              await errorFollowUp(
                itx,
                `Nie udało się znaleźć członka serwera dla ${formatUserWithId(user)}.`,
              );
              return;
            }

            await ensureUsersExist(prisma, [user, itx.user]);

            const result = await acceptVerification({
              prisma,
              messageQueue,
              guild: itx.guild,
              member,
              moderator: itx.member,
              verificationType,
              acceptedAt: itx.createdAt,
            });

            if (!result.success) {
              await errorFollowUp(
                itx,
                `Nie udało się przyjąć weryfikacji ${formatVerificationType(verificationType)} dla ${userMention(user.id)}. Powód: ${inlineCode(result.error)}`,
              );

              return;
            }

            const content = composeSuccessMessage(user, verificationType, result);
            const sentMessage = await sendDirectMessage(user, content);

            const messageSentContent = sentMessage
              ? ""
              : `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`;

            await itx.editReply(
              `Przyjęto weryfikację ${formatVerificationType(verificationType)} dla ${userMention(user.id)}. ${messageSentContent}`,
            );
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

            const verificationUpdated = await prisma.$transaction(async (tx) => {
              if (verificationInProgress) {
                await tx.verification.update({
                  where: { id: verificationInProgress.id },
                  data: { status: "rejected", rejectedAt: itx.createdAt },
                });

                await messageQueue.cancelTx(
                  tx,
                  "verificationEnd",
                  verificationInProgress.id.toString(),
                );
                await cancelVerificationReminders(
                  tx,
                  messageQueue,
                  verificationInProgress.id,
                );

                return verificationInProgress.id;
              }

              const newVerification = await tx.verification.create({
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

              return newVerification.id;
            });

            const sentMessage = await sendVerificationFailedMessage(user);
            const banned = await discordTry(
              async () => {
                const reason = formatBanReason(
                  `Nieudana weryfikacja 16+ [${verificationUpdated}]`,
                  itx.user,
                  itx.createdAt,
                );
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

              await messageQueue.cancelTx(
                tx,
                "verificationEnd",
                verificationInProgress.id.toString(),
              );

              const guildRoles = await getGuildRolesIds(prisma, itx.guildId);
              if (!guildRoles.muteRoleId)
                return { status: "mute_role_not_set" as const };
              return { status: "success" as const, muteRoleId: guildRoles.muteRoleId };
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
  .command("weryfikacja-ok", (command) =>
    command
      .setDefaultMemberPermissions(0)
      .setDescription("Potwierdź weryfikację dla osób 18+")
      .addUser("user", (user) =>
        user.setDescription("Użytkownik, którego weryfikacja ma zostać przyjęta"),
      )
      .handle(async ({ prisma, messageQueue }, { user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const member = await readMember(itx, user);
        if (!member) {
          return errorFollowUp(itx, "Nie znaleziono użytkownika na serwerze");
        }
        await ensureUsersExist(prisma, [member, itx.user]);
        const result = await acceptVerification({
          prisma,
          messageQueue,
          guild: itx.guild,
          member,
          moderator: itx.member,
          verificationType: "plus18",
          acceptedAt: itx.createdAt,
        });

        if (!result.success) {
          return errorFollowUp(
            itx,
            `Nie udało się potwierdzić weryfikacji 18+ dla ${userMention(member.id)}, ${inlineCode(result.error)}`,
          );
        }

        const content = composeSuccessMessage(user, "plus18", result);
        const sentMessage = await sendDirectMessage(user, content);

        const messageSentContent = sentMessage
          ? ""
          : `Nie udało się wysłać wiadomości do ${formatUserWithId(user)}.`;

        await itx.editReply(
          `Przyjęto weryfikację ${formatVerificationType("plus18")} dla ${userMention(user.id)}. ${messageSentContent}`,
        );
      }),
  )
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const verificationInProgress = await getActive16PlusVerification(
      prisma,
      member.guild.id,
      member.id,
    );
    if (!verificationInProgress) return;

    const guildRoles = await getGuildRolesIds(prisma, member.guild.id);
    if (!guildRoles.muteRoleId) return;

    await applyMute(
      member,
      guildRoles.muteRoleId,
      `Przywrócone wyciszenie (weryfikacja 16+) [${verificationInProgress.id}]`,
    );
  });
