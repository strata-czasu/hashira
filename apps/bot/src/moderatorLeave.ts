import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import {
  PermissionFlagsBits,
  TimestampStyles,
  bold,
  heading,
  time,
  userMention,
} from "discord.js";
import { base } from "./base";

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
          .addString("start", (start) => start.setDescription("Początek urlopu"))
          .addString("koniec", (end) => end.setDescription("Koniec urlopu"))
          .handle(
            async ({ prisma }, { user, start: rawStart, koniec: rawEnd }, itx) => {
              if (!itx.inCachedGuild()) return;

              // TODO)) Save the moderatorLeave record

              // TODO)) Add "leave" role if start is now or in the past
              // TODO)) Schedule job to add "leave" role if start is in the future
              // TODO)) Schedule job to remove "leave" role if end is in the future

              // TODO)) Notify the moderator about their leave start
              // TODO)) Notify the moderator about their leave end
            },
          ),
      )
      .addCommand("lista", (command) =>
        command.setDescription("Lista urlopów").handle(async ({ prisma }, _, itx) => {
          if (!itx.inCachedGuild()) return;

          const where = { guildId: itx.guildId };
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
                heading(`${userMention(leave.userId)}`),
                `${bold("Start")}: ${time(leave.createdAt, TimestampStyles.ShortDateTime)}`,
                `${bold("Start")}: ${time(leave.endsAt, TimestampStyles.ShortDateTime)}`,
              ];
              return lines.join("\n");
            },
            false,
          );
          await paginatedView.render(itx);
        }),
      ),
  );
