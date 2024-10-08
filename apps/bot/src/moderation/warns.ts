import { Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type PrismaTransaction,
  type Warn,
} from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import {
  HeadingLevel,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TimestampStyles,
  type User,
  heading,
  inlineCode,
  italic,
  strikethrough,
  time,
  userMention,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { parseUserMentionWorkaround } from "../util/parseUsers";
import { sendDirectMessage } from "../util/sendDirectMessage";
import { formatUserWithId } from "./util";

const getWarn = async (tx: PrismaTransaction, id: number, guildId: string) =>
  tx.warn.findFirst({ where: { guildId, id, deletedAt: null } });

export const createWarnFormat =
  ({ includeUser }: { includeUser: boolean }) =>
  (warn: Warn, _idx: number) => {
    const { id, createdAt, deletedAt, reason, moderatorId, deleteReason } = warn;

    const warnedUserMention = includeUser ? `${userMention(warn.userId)} ` : "";
    const header = heading(
      `${warnedUserMention}${userMention(moderatorId)} ${time(
        createdAt,
        TimestampStyles.ShortDateTime,
      )} [${id}]`,
      HeadingLevel.Three,
    );

    const lines = [
      deletedAt ? strikethrough(header) : header,
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

const getUserWarnsPaginatedView = (
  prisma: ExtendedPrismaClient,
  user: User,
  guildId: string,
  deleted: boolean | null,
) => {
  const where = {
    guildId,
    userId: user.id,
    ...(deleted ? {} : { deletedAt: null }),
  };

  const paginate = new DatabasePaginator(
    (props, createdAt) =>
      prisma.warn.findMany({ where, ...props, orderBy: { createdAt } }),
    () => prisma.warn.count({ where }),
    { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
  );

  const formatWarn = createWarnFormat({ includeUser: false });

  return new PaginatedView(
    paginate,
    `Ostrzeżenia ${user.tag}`,
    formatWarn,
    true,
    `ID: ${user.id}`,
  );
};

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
          .addString("user", (user) => user.setDescription("Użytkownik"))
          .addString("reason", (reason) => reason.setDescription("Powód ostrzeżenia"))
          .handle(
            async ({ prisma, moderationLog: log }, { user: rawUser, reason }, itx) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const user = await parseUserMentionWorkaround(rawUser, itx);
              if (!user) return;
              await ensureUsersExist(prisma, [user, itx.user]);

              const warn = await prisma.warn.create({
                data: {
                  guildId: itx.guildId,
                  userId: user.id,
                  moderatorId: itx.user.id,
                  reason,
                },
              });
              log.push("warnCreate", itx.guild, { warn, moderator: itx.user });

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
            },
          ),
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Usuń ostrzeżenie")
          .addInteger("id", (id) => id.setDescription("ID ostrzeżenia").setMinValue(0))
          .addString("reason", (reason) =>
            reason.setDescription("Powód usunięcia ostrzeżenia").setRequired(false),
          )
          .handle(async ({ prisma, moderationLog: log }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const warn = await prisma.$transaction(async (tx) => {
              const warn = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await errorFollowUp(itx, "Nie znaleziono ostrzeżenia o podanym ID");
                return null;
              }
              await tx.warn.update({
                where: { id },
                data: { deletedAt: new Date(), deleteReason: reason },
              });
              log.push("warnRemove", itx.guild, {
                warn,
                moderator: itx.user,
                removeReason: reason,
              });

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
          .handle(async ({ prisma, moderationLog: log }, { id, reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const warn = await prisma.$transaction(async (tx) => {
              const warn = await getWarn(tx, id, itx.guildId);
              if (!warn) {
                await itx.deleteReply();
                await itx.followUp({
                  content: "Nie znaleziono ostrzeżenia o podanym ID",
                  ephemeral: true,
                });
                return null;
              }
              const originalReason = warn.reason;
              await tx.warn.update({
                where: { id },
                data: { reason },
              });
              log.push("warnEdit", itx.guild, {
                warn,
                moderator: itx.user,
                oldReason: originalReason,
                newReason: reason,
              });

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
          .addString("user", (user) => user.setDescription("Użytkownik"))
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false),
          )
          .handle(async ({ prisma }, { user: rawUser, deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const user = await parseUserMentionWorkaround(rawUser, itx);
            if (!user) return;

            const paginatedView = getUserWarnsPaginatedView(
              prisma,
              user,
              itx.guildId,
              deleted,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("me", (command) =>
        command
          .setDescription("Wyświetl swoje ostrzeżenia")
          .addBoolean("deleted", (deleted) =>
            deleted.setDescription("Pokaż usunięte ostrzeżenia").setRequired(false),
          )
          .handle(async ({ prisma }, { deleted }, itx) => {
            if (!itx.inCachedGuild()) return;

            const paginatedView = getUserWarnsPaginatedView(
              prisma,
              itx.user,
              itx.guildId,
              deleted,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
