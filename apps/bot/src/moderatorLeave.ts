import { TZDate } from "@date-fns/tz";
import { Hashira, PaginatedView, waitForConfirmation } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { endOfDay, formatDate, startOfDay } from "date-fns";
import {
  HeadingLevel,
  PermissionFlagsBits,
  TimestampStyles,
  bold,
  heading,
  time,
  userMention,
} from "discord.js";
import { base } from "./base";
import { TZ } from "./specializedConstants";
import { parseDate } from "./util/dateParsing";
import { ensureUserExists } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";
import { fetchMembers } from "./util/fetchMembers";

export const moderatorLeave = new Hashira({ name: "moderator-leave" })
  .use(base)
  .group("urlop", (group) =>
    group
      .setDescription("Zarządzanie urlopami moderatorów")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .setDMPermission(false)
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Dodaj urlop")
          .addUser("user", (user) => user.setDescription("Moderator"))
          .addString("start", (start) =>
            start.setDescription("Początek urlopu, np. 05-15, 2025-05-15, today"),
          )
          .addString("koniec", (end) =>
            end.setDescription("Koniec urlopu, np. 05-20, 2025-05-20, tomorrow"),
          )
          .addBoolean("dodaj-role", (addRole) =>
            addRole.setDescription("Czy dodać rolę urlopową moderatorowi"),
          )
          .handle(
            async (
              { prisma, messageQueue },
              { user, start: rawStart, koniec: rawEnd, "dodaj-role": addRole },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const parsedStart = parseDate(rawStart, "start", null);
              if (!parsedStart) {
                return errorFollowUp(
                  itx,
                  "Nieprawidłowa data początku urlopu. Podaj datę w formacie RRRR-MM-DD (bez godziny)",
                );
              }
              const parsedEnd = parseDate(rawEnd, "end", null);
              if (!parsedEnd) {
                return errorFollowUp(
                  itx,
                  "Nieprawidłowa data końca urlopu. Podaj datę w formacie RRRR-MM-DD (bez godziny)",
                );
              }

              const startsAt = startOfDay(new TZDate(parsedStart, TZ));
              const endsAt = endOfDay(new TZDate(parsedEnd, TZ));
              if (endsAt <= startsAt) {
                return errorFollowUp(itx, "Koniec urlopu musi być po jego początku");
              }

              const overlappingLeave = await prisma.moderatorLeave.findFirst({
                where: {
                  guildId: itx.guildId,
                  userId: user.id,
                  deletedAt: null,
                  OR: [
                    {
                      startsAt: { lte: endsAt },
                      endsAt: { gte: startsAt },
                    },
                    {
                      startsAt: { lte: startsAt },
                      endsAt: { gte: endsAt },
                    },
                  ],
                },
              });
              if (overlappingLeave) {
                return errorFollowUp(
                  itx,
                  "Ten moderator ma aktywny lub zaplanowany urlop w tym zakresie czasowym",
                );
              }

              await ensureUserExists(prisma, user.id);
              const leave = await prisma.moderatorLeave.create({
                data: {
                  guildId: itx.guildId,
                  userId: user.id,
                  startsAt,
                  endsAt,
                  addRole,
                },
              });

              await messageQueue.push(
                "moderatorLeaveStart",
                { leaveId: leave.id, userId: user.id, guildId: itx.guildId },
                startsAt,
                leave.id.toString(),
              );
              await messageQueue.push(
                "moderatorLeaveEnd",
                { leaveId: leave.id, userId: user.id, guildId: itx.guildId },
                endsAt,
                leave.id.toString(),
              );

              await itx.editReply(
                `Dodano urlop dla ${userMention(user.id)} od ${time(startsAt, TimestampStyles.LongDate)} do ${time(endsAt, TimestampStyles.LongDate)}`,
              );
            },
          ),
      )
      .addCommand("usuń", (command) =>
        command
          .setDescription("Usuń lub zakończ urlop")
          .addNumber("urlop", (id) =>
            id.setDescription("Urlop do usunięcia").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            const results = await prisma.moderatorLeave.findMany({
              where: {
                guildId: itx.guild.id,
                deletedAt: null,
                endsAt: { gt: itx.createdAt },
              },
            });
            const userIds = results.map((r) => r.userId);
            const members = await fetchMembers(itx.guild, userIds);
            const dateFormat = "yyyy-MM-dd";
            await itx.respond(
              results.map((r) => ({
                value: r.id,
                name: `${members.get(r.userId)?.user.tag ?? r.userId} ${formatDate(r.startsAt, dateFormat)} - ${formatDate(r.endsAt, dateFormat)}`,
              })),
            );
          })
          .handle(async ({ prisma, messageQueue }, { urlop: leaveId }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const leave = await prisma.moderatorLeave.findFirst({
              where: { id: leaveId, guildId: itx.guildId },
            });
            if (!leave) {
              return await errorFollowUp(itx, "Nie znaleziono urlopu o podanym ID");
            }

            const confirmation = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              `Czy na pewno chcesz usunąć urlop ${userMention(leave.userId)}?`,
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );

            if (!confirmation) {
              errorFollowUp;
              await itx.editReply({
                content: "Anulowano usunięcie urlopu",
                components: [],
              });
              return;
            }

            await prisma.$transaction(async (tx) => {
              await tx.moderatorLeave.update({
                where: { id: leaveId },
                data: { deletedAt: itx.createdAt },
              });
              await messageQueue.cancelTx(
                tx,
                "moderatorLeaveStart",
                leaveId.toString(),
              );
              if (leave.startsAt < itx.createdAt && itx.createdAt < leave.endsAt) {
                // End the leave now if it was already in progress
                await messageQueue.updateDelayTx(
                  tx,
                  "moderatorLeaveEnd",
                  leaveId.toString(),
                  itx.createdAt,
                );
              } else {
                await messageQueue.cancelTx(
                  tx,
                  "moderatorLeaveEnd",
                  leaveId.toString(),
                );
              }
            });

            await itx.editReply({
              content: `Usunięto urlop ${userMention(leave.userId)} ${time(leave.startsAt, TimestampStyles.ShortDateTime)} - ${time(leave.endsAt, TimestampStyles.ShortDateTime)} [${leave.id}]`,
              components: [],
            });
          }),
      )
      .addCommand("lista", (command) =>
        command.setDescription("Lista urlopów").handle(async ({ prisma }, _, itx) => {
          if (!itx.inCachedGuild()) return;

          const where: Prisma.ModeratorLeaveWhereInput = {
            guildId: itx.guildId,
            endsAt: { gt: itx.createdAt },
            deletedAt: null,
          };
          const paginate = new DatabasePaginator(
            (props, createdAt) =>
              prisma.moderatorLeave.findMany({
                where,
                ...props,
                orderBy: { createdAt },
              }),
            () => prisma.moderatorLeave.count({ where }),
            { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
          );

          const paginatedView = new PaginatedView(
            paginate,
            "Urlopy moderatorów",
            (leave) => {
              const lines = [
                heading(userMention(leave.userId), HeadingLevel.Two),
                `${bold("Start")}: ${time(leave.startsAt, TimestampStyles.ShortDateTime)}`,
                `${bold("Koniec")}: ${time(leave.endsAt, TimestampStyles.ShortDateTime)}`,
              ];
              return lines.join("\n");
            },
            false,
          );
          await paginatedView.render(itx);
        }),
      ),
  );
