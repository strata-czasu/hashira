import { inlineCode, PermissionFlagsBits, type User } from "discord.js";
import { time, TimestampStyles } from "discord.js";

import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";

import { base } from "../base";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { sendDirectMessage } from "../util/sendDirectMessage";

const NICK_RESET_DM_TEMPLATE = `
Twój pseudonim na Stracie Czasu został zresetowany, ponieważ nie dało się go spingować wpisując pierwsze kilka liter pseudonimu w pasek wysyłania wiadomości na Discordzie.

Napisz do osoby, która zresetowała Ci nick ({{moderator}}), jego nową pingowalną wersję lub zdobądź 5 poziom, żeby móc samodzielnie zmienić swój pseudonim.
`;

function formatNickResetDmContent(moderator: User) {
  return NICK_RESET_DM_TEMPLATE.replace("{{moderator}}", `${moderator} (${moderator.tag})`);
}

export const nick = new Hashira({ name: "nick" })
  .use(base)
  .group("nick", (group) =>
    group
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .setDescription("Zarządzaj nickami użytkowników")
      .addCommand("ustaw", (command) =>
        command
          .setDescription("Ustaw nick użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik, którego nick chcesz ustawić"))
          .addString("nick", (nick) => nick.setDescription("Nowy nick użytkownika"))
          .handle(async (_, { user, nick }, itx) => {
            if (!itx.inCachedGuild()) return;

            await itx.deferReply({ flags: "Ephemeral" });

            const member = itx.guild.members.cache.get(user.id);
            if (!member) {
              return await errorFollowUp(itx, "Użytkownika nie ma na serwerze.");
            }

            if (nick.length < 1 || nick.length > 32) {
              return await errorFollowUp(itx, "Nick musi mieć od 1 do 32 znaków.");
            }

            await member.setNickname(
              nick,
              `Ustawienie nicku (moderator: ${itx.user.tag} (${itx.user.id}))`,
            );
            await itx.editReply(`Ustawiono nick użytkownika ${user.tag} na ${inlineCode(nick)}.`);
          }),
      )
      .addCommand("reset", (command) =>
        command
          .setDescription("Zresetuj nick użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik do zresetowania nicku"))
          .handle(async (_, { user }, itx) => {
            if (!itx.inCachedGuild()) return;

            await itx.deferReply({ flags: "Ephemeral" });

            const member = itx.guild.members.cache.get(user.id);
            if (!member) {
              return await errorFollowUp(itx, "Użytkownika nie ma na serwerze.");
            }

            await member.setNickname(
              user.username,
              `Reset nicku (moderator: ${itx.user.tag} (${itx.user.id}))`,
            );

            const response = [`Zresetowano nick użytkownika ${user.tag}.`];

            await user.createDM();
            const dmContent = formatNickResetDmContent(itx.user);
            const sentDm = await sendDirectMessage(user, dmContent);
            if (!sentDm) {
              response.push("Nie udało się wysłać prywatnej wiadomości do użytkownika.");
            }

            await itx.editReply(response.join("\n"));
          }),
      ),
  )
  .command("nick-historia", (command) =>
    command
      .setDescription("Historia nicków użytkownika")
      .setDMPermission(false)
      .addUser("user", (user) => user.setDescription("Użytkownik").setRequired(false))
      .handle(async ({ prisma }, { user: selectedUser }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const user = selectedUser ?? itx.user;
        const where = { guildId: itx.guildId, userId: user.id };
        const paginator = new DatabasePaginator(
          (props, ordering) =>
            prisma.nicknameChange.findMany({
              ...props,
              where,
              orderBy: [{ timestamp: ordering }, { id: ordering }],
            }),
          () => prisma.nicknameChange.count({ where }),
          { pageSize: 15, defaultOrder: PaginatorOrder.DESC },
        );

        const paginatedView = new PaginatedView(
          paginator,
          `Historia nicków ${user.username}`,
          ({ timestamp, nickname }) =>
            `${time(timestamp, TimestampStyles.ShortDate)} - ${nickname}`,
          true,
        );
        await paginatedView.render(itx);
      }),
  )
  .handle("guildMemberUpdate", async ({ prisma }, oldMember, newMember) => {
    // `member.displayName` resolves to the guild nickname or global display name
    // This gives us tracking of events when the guild nickname is removed
    if (oldMember.displayName === newMember.displayName) return;

    await ensureUserExists(prisma, newMember);

    const lastChange = await prisma.nicknameChange.findFirst({
      where: {
        guildId: newMember.guild.id,
        userId: newMember.user.id,
      },
      orderBy: { timestamp: "desc" },
    });
    // Check if we missed the previous name change
    if (lastChange?.nickname != oldMember.displayName) {
      await prisma.nicknameChange.create({
        data: {
          guildId: newMember.guild.id,
          userId: newMember.user.id,
          nickname: oldMember.displayName,
        },
      });
    }

    await prisma.nicknameChange.create({
      data: {
        guildId: newMember.guild.id,
        userId: newMember.user.id,
        nickname: newMember.displayName,
      },
    });
  });
