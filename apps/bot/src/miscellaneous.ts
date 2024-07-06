import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { count, eq } from "@hashira/db/drizzle";
import { PaginatorOrder, StaticPaginator } from "@hashira/paginate";
import {
  AttachmentBuilder,
  type GuildBasedChannel,
  HeadingLevel,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  heading,
  inlineCode,
  time,
} from "discord.js";
import { base } from "./base";
import { createFormatMuteInList } from "./moderation/mutes";
import { createWarnFormat } from "./moderation/warns";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";
import { fetchMembers } from "./util/fetchMembers";
import { parseUserMentions } from "./util/parseUsers";

export const miscellaneous = new Hashira({ name: "miscellaneous" })
  .use(base)
  .group("misc", (group) =>
    group
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .setDescription("Miscellaneous commands")
      .addCommand("parse-statbot", (command) =>
        command
          .setDescription("Parse a Statbot output")
          .addAttachment("csv", (option) =>
            option.setDescription("The CSV file to parse"),
          )
          .handle(async (_, { csv }, itx) => {
            if (csv.size > 100_000) return;
            // rank,name,id,count
            // 1,username_1,123456789012345678,100
            const content = await fetch(csv.url).then((res) => res.text());
            const lines = content.split("\n");
            const ids = lines.slice(1).map((line) => {
              const [_, __, id] = line.split(",");
              return `<@${id}>`;
            });

            const attachment = new AttachmentBuilder(Buffer.from(ids.join(" ")), {
              name: "parsed.txt",
            });

            await itx.reply({ files: [attachment] });
          }),
      )
      .addCommand("add-role", (command) =>
        command
          .setDescription("Add a role to a list of users")
          .addAttachment("users", (option) =>
            option.setDescription("The users to add the role to"),
          )
          .addRole("role", (option) =>
            option.setDescription("The role to add to the user"),
          )
          .handle(async (_, { users, role }, itx) => {
            // Don't allow for more than 10 kilobytes of users
            if (users.size > 20_000) return;
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const content = await fetch(users.url).then((res) => res.text());
            const members = await fetchMembers(itx.guild, parseUserMentions(content));

            await itx.editReply("Fetched members, now adding roles.");

            await Promise.all(members.map((member) => member.roles.add(role.id)));

            await itx.editReply("Added role to users");
          }),
      )
      .addCommand("last-mutes", (command) =>
        command.setDescription("Get the last mutes").handle(async ({ db }, _, itx) => {
          if (!itx.inCachedGuild()) return;

          const muteWheres = eq(schema.mute.guildId, itx.guildId);

          const paginate = new DatabasePaginator({
            orderBy: schema.mute.createdAt,
            ordering: PaginatorOrder.DESC,
            select: db.select().from(schema.mute).where(muteWheres).$dynamic(),
            count: db
              .select({ count: count() })
              .from(schema.mute)
              .where(muteWheres)
              .$dynamic(),
          });

          const formatMute = createFormatMuteInList({ includeUser: true });

          const paginatedView = new PaginatedView(
            paginate,
            "Ostatnie wyciszenia",
            formatMute,
            true,
          );

          await paginatedView.render(itx);
        }),
      )
      .addCommand("show-pending-tasks", (command) =>
        command.setDescription("Show pending tasks").handle(async ({ db }, _, itx) => {
          if (!itx.inCachedGuild()) return;

          const paginator = new DatabasePaginator({
            select: db
              .select()
              .from(schema.task)
              .where(eq(schema.task.status, "pending"))
              .$dynamic(),
            count: db
              .select({ count: count() })
              .from(schema.task)
              .where(eq(schema.task.status, "pending"))
              .$dynamic(),
            orderBy: schema.task.createdAt,
          });

          const formatTask = ({
            id,
            data,
            createdAt,
            handleAfter,
            identifier,
          }: typeof schema.task.$inferSelect) => {
            const lines = [
              heading(`Task ${id}`, HeadingLevel.Three),
              `Created at: ${time(createdAt)}`,
              `Handle after: ${time(handleAfter)}`,
              `Identifier: ${identifier}`,
              `Data: ${inlineCode(JSON.stringify(data))}`,
            ];

            return lines.join("\n");
          };

          const paginatedView = new PaginatedView(
            paginator,
            "Pending tasks",
            formatTask,
            true,
          );

          await paginatedView.render(itx);
        }),
      )
      .addCommand("last-warns", (command) =>
        command.setDescription("Get the last warns").handle(async ({ db }, _, itx) => {
          if (!itx.inCachedGuild()) return;

          const warnWheres = eq(schema.warn.guildId, itx.guildId);

          const paginate = new DatabasePaginator({
            orderBy: schema.warn.createdAt,
            ordering: PaginatorOrder.DESC,
            select: db.select().from(schema.warn).where(warnWheres).$dynamic(),
            count: db
              .select({ count: count() })
              .from(schema.warn)
              .where(warnWheres)
              .$dynamic(),
          });

          const formatWarn = createWarnFormat({ includeUser: true });

          const paginatedView = new PaginatedView(
            paginate,
            "Ostatnie ostrzeżenia",
            formatWarn,
            true,
          );

          await paginatedView.render(itx);
        }),
      )
      .addCommand("last-added-channels", (command) =>
        command
          .setDescription("Get the last added channels")
          .handle(async (_, __, itx) => {
            if (!itx.inCachedGuild()) return;

            const channels = itx.guild.channels.cache;

            const paginator = new StaticPaginator({
              items: [...channels.values()],
              pageSize: 10,
              compare: (a, b) => a.createdTimestamp ?? 0 - (b.createdTimestamp ?? 0),
            });

            const formatChannel = (channel: GuildBasedChannel) =>
              `${channel.name} (${channel.id}) - ${time(
                channel.createdAt ?? new Date(),
              )}`;

            const paginatedView = new PaginatedView(
              paginator,
              "Ostatnio dodane kanały",
              formatChannel,
              true,
            );

            await paginatedView.render(itx);
          }),
      )
      .addCommand("did-not-react", (command) =>
        command
          .setDescription("Pokaż osoby z roli, które nie zareagowały na wiadomość")
          .addString("message", (message) => message.setDescription("ID wiadomości"))
          .addRole("role", (role) => role.setDescription("Rola"))
          .addString("emoji", (emoji) => emoji.setDescription("Emoji"))
          .handle(async (_, { message: messageId, role, emoji: emojiName }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const message = await discordTry(
              async () => itx.channel?.messages.fetch(messageId),
              [RESTJSONErrorCodes.UnknownChannel],
              () => null,
            );
            if (!message) {
              return await errorFollowUp(itx, "Nie znaleziono wiadomości");
            }

            const reaction = message.reactions.cache.find(
              (reaction) => reaction.emoji.name === emojiName,
            );
            if (!reaction) {
              return await errorFollowUp(itx, "Nie znaleziono reakcji");
            }

            const users = await reaction.users.fetch();
            const reactedMembers = await fetchMembers(
              itx.guild,
              users.map((user) => user.id),
            );
            const notReactedMembers = role.members.filter(
              (member) => !reactedMembers.has(member.id),
            );

            const paginator = new StaticPaginator({
              items: [...notReactedMembers.values()],
              pageSize: 10,
            });
            const paginatedView = new PaginatedView(
              paginator,
              "Osoby, które nie zareagowały",
              (member) => `${member.user.tag} (${member.id})`,
              true,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
