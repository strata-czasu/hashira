import { TZDate } from "@date-fns/tz";
import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { endOfDay, startOfDay } from "date-fns";
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
import { errorFollowUp } from "./util/errorFollowUp";

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
            start.setDescription("Początek urlopu, np. 2025-05-15"),
          )
          .addString("koniec", (end) =>
            end.setDescription("Koniec urlopu, np. 2025-05-20"),
          )
          .addBoolean("dodaj-role", (addRole) =>
            addRole
              .setDescription("Czy dodać rolę urlopową moderatorowi (domyślnie tak)")
              .setRequired(false),
          )
          .handle(
            async (
              { prisma, messageQueue },
              { user, start: rawStart, koniec: rawEnd, "dodaj-role": addRole },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const activeOrScheduledLeave = await prisma.moderatorLeave.findFirst({
                where: {
                  guildId: itx.guildId,
                  userId: user.id,
                  endsAt: { gt: itx.createdAt },
                  deletedAt: null,
                },
              });
              if (activeOrScheduledLeave) {
                return errorFollowUp(
                  itx,
                  "Ten moderator ma już aktywny lub zaplanowany urlop",
                );
              }

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

              const leave = await prisma.moderatorLeave.create({
                data: {
                  guildId: itx.guildId,
                  userId: user.id,
                  startsAt,
                  endsAt,
                  addRole: addRole ?? true,
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

              itx.editReply(
                `Dodano urlop dla ${userMention(user.id)} od ${time(startsAt, TimestampStyles.LongDate)} do ${time(endsAt, TimestampStyles.LongDate)}`,
              );
            },
          ),
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
                `${bold("Start")}: ${time(leave.createdAt, TimestampStyles.ShortDateTime)}`,
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
