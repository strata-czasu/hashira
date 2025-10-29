import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Task } from "@hashira/db";
import { PaginatorOrder, StaticPaginator } from "@hashira/paginate";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  channelMention,
  DiscordjsErrorCodes,
  type GuildBasedChannel,
  HeadingLevel,
  heading,
  inlineCode,
  ModalBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TextInputBuilder,
  TextInputStyle,
  time,
} from "discord.js";
import { isNil, isNotNil } from "es-toolkit";
import { base } from "./base";
import { addBalances } from "./economy/managers/transferManager";
import { createFormatMuteInList } from "./moderation/mutes";
import { createWarnFormat } from "./moderation/warns";
import { STRATA_CZASU_CURRENCY } from "./specializedConstants";
import { AsyncFunction } from "./util/asyncFunction";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";
import { fetchMembers } from "./util/fetchMembers";
import { isNotOwner } from "./util/isOwner";
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
        command
          .setDescription("Get the last mutes")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const where = { guildId: itx.guildId };

            const paginate = new DatabasePaginator(
              (props, createdAt) =>
                prisma.mute.findMany({ where, ...props, orderBy: { createdAt } }),
              () => prisma.mute.count({ where }),
              { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
            );

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
        command
          .setDescription("Show pending tasks")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const where = { status: "pending" } as const;

            const paginate = new DatabasePaginator(
              (props, createdAt) =>
                prisma.task.findMany({ where, ...props, orderBy: { createdAt } }),
              () => prisma.task.count({ where }),
            );

            const formatTask = ({
              id,
              data,
              createdAt,
              handleAfter,
              identifier,
            }: Task) => {
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
              paginate,
              "Pending tasks",
              formatTask,
              true,
            );

            await paginatedView.render(itx);
          }),
      )
      .addCommand("last-warns", (command) =>
        command
          .setDescription("Get the last warns")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const where = { guildId: itx.guildId };

            const paginate = new DatabasePaginator(
              (props, createdAt) =>
                prisma.warn.findMany({ where, ...props, orderBy: { createdAt } }),
              () => prisma.warn.count({ where }),
              { pageSize: 5, defaultOrder: PaginatorOrder.DESC },
            );

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
      )
      .addCommand("clean-balances", (command) =>
        command.setDescription("Clean balances").handle(async ({ prisma }, _, itx) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          await prisma.wallet.updateMany({
            where: { guildId: itx.guildId },
            data: { balance: 0 },
          });

          await itx.editReply("Balances cleaned");
        }),
      )
      .addCommand("add-balance-to-role", (command) =>
        command
          .setDescription("Add balance to role")
          .addRole("role", (role) => role.setDescription("Role"))
          .addInteger("amount", (amount) => amount.setDescription("Amount"))
          .handle(async ({ prisma }, { role, amount }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const members = [...role.members.keys()];

            await addBalances({
              prisma,
              fromUserId: itx.user.id,
              guildId: itx.guildId,
              toUserIds: members,
              amount,
              reason: "Added balance to role",
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
            });

            await itx.editReply("Added balance to role");
          }),
      )
      .addCommand("check-remaining-user-permisisons", (command) =>
        command
          .setDescription("Find all channels where the user has per-user permissions")
          .addUser("user", (user) => user.setDescription("User"))
          .handle(async (_, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const channels = await itx.guild.channels.fetch();
            const overrides = channels
              .mapValues((channel) => channel?.permissionOverwrites.resolve(user.id))
              .filter(isNotNil);

            const paginator = new StaticPaginator({
              items: [...overrides.keys()].map(channelMention),
              pageSize: 10,
            });

            const paginatedView = new PaginatedView(
              paginator,
              "Channels with per-user permissions",
              (channel) => channel,
              false,
            );

            await paginatedView.render(itx);
          }),
      )
      .addCommand("count-guild-tags", (command) =>
        command
          .setDescription("Count most popular guild tags")
          .handle(async (_, __, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            let after: string | undefined;
            const tagCounts: Record<string, number> = {};
            const limit = 1000;

            while (true) {
              const members = await itx.guild.members.list({
                ...(after ? { after } : {}),
                limit,
              });
              if (members.size === 0) break;

              for (const member of members.values()) {
                const primaryGuild = member.user.primaryGuild;
                if (!primaryGuild) continue;
                const tag = primaryGuild.tag;
                if (!tag) continue;
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              }

              if (members.size < limit) break;

              const last = members.last();
              if (!last) break;
              after = last.id;
            }

            const items = Object.entries(tagCounts).map(([tag, count]) => ({
              tag,
              count,
            }));
            const paginator = new StaticPaginator({
              items,
              pageSize: 10,
              compare: (a, b) => a.count - b.count,
            });

            const paginatedView = new PaginatedView(
              paginator,
              "Najpopularniejsze tagi",
              ({ tag, count }) => `${tag} - ${count}`,
              true,
            );

            await paginatedView.render(itx);
          }),
      )
      .addCommand("eval", (command) =>
        command
          .setDescription("Evaluate code")
          .addString("code", (code) => code.setDescription("Code").setRequired(false))
          .handle(async (ctx, { code: rawCode }, itx) => {
            if (await isNotOwner(itx.user)) return;
            let responder = itx.reply.bind(itx);

            let code: string;
            if (rawCode) code = rawCode;
            else {
              const customId = `eval-${itx.id}`;
              await itx.showModal(
                new ModalBuilder()
                  .setTitle("Eval")
                  .setCustomId(customId)
                  .addComponents(
                    new ActionRowBuilder({
                      components: [
                        new TextInputBuilder()
                          .setCustomId(`code-${itx.id}`)
                          .setLabel("Code")
                          .setPlaceholder("Code")
                          .setStyle(TextInputStyle.Paragraph),
                      ],
                    }),
                  ),
              );

              const submitAction = await discordTry(
                () =>
                  itx.awaitModalSubmit({
                    time: 60_000,
                    filter: (modal) => modal.customId === customId,
                  }),
                [DiscordjsErrorCodes.InteractionCollectorError],
                () => null,
              );
              if (!submitAction) return;

              responder = submitAction.reply.bind(submitAction);
              code = submitAction.fields.getTextInputValue(`code-${itx.id}`);
            }

            const lines = code.split("\n").map((line) => line.trim());

            if (!lines.at(-1)?.includes("return")) {
              lines[lines.length - 1] = `return ${lines.at(-1)}`;
            }

            let result: unknown;
            try {
              const fn = AsyncFunction("ctx", "itx", lines.join("\n"));
              result = await fn(ctx, itx);
            } catch (error) {
              await responder({ content: `Error: ${error}`, flags: "Ephemeral" });
              return;
            }

            const strVal =
              typeof result === "string" ? result : JSON.stringify(result, null, 2);

            if (isNil(strVal)) {
              await responder({ content: "No result" });
              return;
            }

            if (strVal.length > 2000) {
              const attachment = new AttachmentBuilder(Buffer.from(strVal), {
                name: "result.txt",
              });
              await responder({ files: [attachment] });
              return;
            }

            await responder({ content: strVal });
          }),
      ),
  );
