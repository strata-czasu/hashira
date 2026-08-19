import { Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type Prisma,
  type Task,
} from "@hashira/db";
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
import { WalletCreationError } from "./economy/economyError";
import { getCurrency } from "./economy/managers/currencyManager";
import { addBalances } from "./economy/managers/transferManager";
import { createFormatMuteInList } from "./moderation/mutes";
import { createWarnFormat } from "./moderation/warns";
import { STRATA_CZASU_CURRENCY } from "./specializedConstants";
import { AsyncFunction } from "./util/asyncFunction";
import { discordTry } from "./util/discordTry";
import { ensureUsersExist } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";
import { fetchMembers } from "./util/fetchMembers";
import { isNotOwner } from "./util/isOwner";
import { parseUserMentions } from "./util/parseUsers";
import { PRIVILEGED_FEATURES_DISABLED_MESSAGE } from "./util/privilegedIntents";

type ImportWalletBalanceRow = { userId: string; amount: number };

const importWalletBalancesChunk = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  rows: ImportWalletBalanceRow[],
) => {
  await prisma.$transaction(async (tx) => {
    await ensureUsersExist(
      tx,
      rows.map((row) => row.userId),
    );

    const currency = await getCurrency({
      prisma: tx,
      guildId,
      currencySymbol: STRATA_CZASU_CURRENCY.symbol,
    });

    const uniqueUserIds = [...new Set(rows.map((row) => row.userId))];

    await tx.wallet.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        guildId,
        name: STRATA_CZASU_CURRENCY.defaultWalletName,
        currencyId: currency.id,
        default: true,
      })),
      skipDuplicates: true,
    });

    const wallets = await tx.wallet.updateManyAndReturn({
      where: {
        userId: { in: uniqueUserIds },
        guildId,
        name: STRATA_CZASU_CURRENCY.defaultWalletName,
        currencyId: currency.id,
      },
      data: { default: true },
    });

    const walletIdByUserId = new Map(
      wallets.map((wallet) => [wallet.userId, wallet.id]),
    );

    const walletAmounts: { walletId: number; amount: number }[] = [];
    for (const { userId, amount } of rows) {
      const walletId = walletIdByUserId.get(userId);
      if (!walletId) throw new WalletCreationError([userId]);
      walletAmounts.push({ walletId, amount });
    }

    const walletIdsByAmount = new Map<number, number[]>();
    for (const { walletId, amount } of walletAmounts) {
      const walletIds = walletIdsByAmount.get(amount) ?? [];
      walletIds.push(walletId);
      walletIdsByAmount.set(amount, walletIds);
    }

    for (const [amount, walletIds] of walletIdsByAmount) {
      await tx.wallet.updateMany({
        where: { id: { in: walletIds } },
        data: { balance: { increment: amount } },
      });
    }

    await tx.transaction.createMany({
      data: walletAmounts.map(({ walletId, amount }) => ({
        walletId,
        relatedUserId: null,
        amount,
        reason: "Wallet import",
        entryType: amount > 0 ? "credit" : "debit",
        transactionType: "add",
      })),
    });
  });
};

type ImportInventoryRow = {
  userId: string;
  itemName: string;
  description: string;
  quantity: number;
};

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      if (row.some((field) => field !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field);
  if (row.some((field) => field !== "")) rows.push(row);
  return rows;
};

const importInventoryChunk = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  createdBy: string,
  rows: ImportInventoryRow[],
) => {
  await prisma.$transaction(async (tx) => {
    await ensureUsersExist(tx, [createdBy, ...rows.map((row) => row.userId)]);

    const uniqueNames = [...new Set(rows.map((row) => row.itemName))];
    const existingItems = await tx.item.findMany({
      where: { guildId, name: { in: uniqueNames }, deletedAt: null },
      select: { id: true, name: true },
    });
    const itemIdByName = new Map(existingItems.map((item) => [item.name, item.id]));

    const missingNames = uniqueNames.filter((name) => !itemIdByName.has(name));
    if (missingNames.length > 0) {
      const firstRowByName = new Map(rows.map((row) => [row.itemName, row]));
      const created = await tx.item.createManyAndReturn({
        data: missingNames.map((name) => ({
          guildId,
          createdBy,
          type: "item" as const,
          name,
          description: firstRowByName.get(name)?.description || null,
        })),
        select: { id: true, name: true },
      });
      for (const item of created) itemIdByName.set(item.name, item.id);
    }

    const inventoryItems: Prisma.InventoryItemCreateManyInput[] = [];
    const totals: { userId: string; itemId: number; quantity: number }[] = [];
    for (const row of rows) {
      const itemId = itemIdByName.get(row.itemName);
      if (!itemId) throw new Error(`Item not found: ${row.itemName}`);
      for (let i = 0; i < row.quantity; i++) {
        inventoryItems.push({ userId: row.userId, itemId });
      }
      totals.push({ userId: row.userId, itemId, quantity: row.quantity });
    }

    await tx.inventoryItem.createMany({ data: inventoryItems });

    for (const { userId, itemId, quantity } of totals) {
      await tx.inventoryItemTotal.upsert({
        where: { userId_itemId: { userId, itemId } },
        create: { userId, itemId, quantity },
        update: { quantity: { increment: quantity } },
      });
    }
  });
};

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
            const content = await fetch(csv.url).then((res) => res.text());
            const lines = content.split("\n");

            const header = lines[0];
            if (!header) return errorFollowUp(itx, "Plik CSV jest pusty");

            const idIndex = header.split(",").indexOf("id");
            if (idIndex === -1)
              return errorFollowUp(itx, "Nie znaleziono kolumny 'id'");

            const ids = lines.slice(1).map((line) => {
              const parts = line.split(",");
              return `<@${parts[idIndex]}>`;
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
          .handle(async (ctx, { message: messageId, role, emoji: emojiName }, itx) => {
            if (!ctx.privilegedIntentsEnabled) {
              return errorFollowUp(itx, PRIVILEGED_FEATURES_DISABLED_MESSAGE);
            }
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
          .handle(async (ctx, { role, amount }, itx) => {
            if (!ctx.privilegedIntentsEnabled) {
              return errorFollowUp(itx, PRIVILEGED_FEATURES_DISABLED_MESSAGE);
            }
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const members = [...role.members.keys()];

            await addBalances({
              prisma: ctx.prisma,
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
      .addCommand("import-wallet-balances", (command) =>
        command
          .setDescription("Import wallet balances from a CSV")
          .addAttachment("csv", (option) =>
            option.setDescription("CSV with user_id,guild_id,waluta"),
          )
          .addString("after-user", (option) =>
            option.setDescription(
              "Resume after this user id (from a previous failure report)",
            ),
          )
          .handle(async (ctx, { csv, "after-user": afterUser }, itx) => {
            if (!itx.inCachedGuild()) return;
            if (csv.size > 10_000_000) return;
            await itx.deferReply();

            const content = await fetch(csv.url).then((res) => res.text());

            const rows: { userId: string; amount: number }[] = [];
            for (const line of content.split("\n").slice(1)) {
              const [userId, guildId, waluta] = line.split(",");
              if (!userId || guildId !== itx.guildId) continue;
              const amount = Number(waluta);
              if (!Number.isSafeInteger(amount) || amount === 0) continue;
              rows.push({ userId, amount });
            }

            rows.sort((a, b) =>
              a.userId.localeCompare(b.userId, undefined, { numeric: true }),
            );

            const chunkSize = 1_000;
            const chunks: { userId: string; amount: number }[][] = [];
            for (let i = 0; i < rows.length; i += chunkSize) {
              chunks.push(rows.slice(i, i + chunkSize));
            }

            const startIndex = afterUser
              ? chunks.findIndex((chunk) => {
                  const last = chunk.at(-1);
                  return last
                    ? last.userId.localeCompare(afterUser, undefined, {
                        numeric: true,
                      }) > 0
                    : false;
                })
              : 0;

            if (startIndex === -1) {
              await itx.editReply("Nothing to import (all users already processed)");
              return;
            }

            let processed = 0;
            let lastProcessedUserId: string | undefined;

            for (let index = startIndex; index < chunks.length; index++) {
              const chunk = chunks[index];
              if (!chunk) continue;
              try {
                await importWalletBalancesChunk(ctx.prisma, itx.guildId, chunk);
              } catch (error) {
                await itx.editReply(
                  `Import failed. Last successfully processed user: ${lastProcessedUserId ?? "none"}. Rerun with after-user=${lastProcessedUserId ?? ""} to resume. Error: ${error}`,
                );
                return;
              }
              processed += chunk.length;
              lastProcessedUserId = chunk.at(-1)?.userId;
              await itx
                .editReply(
                  `Importing wallet balances... ${processed}/${rows.length} users (last user: ${lastProcessedUserId})`,
                )
                .catch(() => {});
            }

            await itx.editReply(`Imported balances for ${processed} users`);
          }),
      )
      .addCommand("import-inventory", (command) =>
        command
          .setDescription("Import inventory from a CSV")
          .addAttachment("csv", (option) =>
            option.setDescription("CSV with user_id,guild_id,nazwa,opis,ilosc"),
          )
          .addString("after-user", (option) =>
            option.setDescription(
              "Resume after this user id (from a previous failure report)",
            ),
          )
          .handle(async (ctx, { csv, "after-user": afterUser }, itx) => {
            if (!itx.inCachedGuild()) return;
            if (csv.size > 10_000_000) return;
            await itx.deferReply();

            const content = await fetch(csv.url).then((res) => res.text());

            const rows: ImportInventoryRow[] = [];
            for (const columns of parseCsv(content).slice(1)) {
              const [userId, guildId, itemName, description, ilosc] = columns;
              if (!userId || guildId !== itx.guildId) continue;
              const quantity = Number(ilosc);
              if (!Number.isSafeInteger(quantity) || quantity <= 0) continue;
              if (!itemName) continue;
              rows.push({
                userId,
                itemName,
                description: description?.trim() || "",
                quantity,
              });
            }

            rows.sort((a, b) =>
              a.userId.localeCompare(b.userId, undefined, { numeric: true }),
            );

            const chunkSize = 10;
            const chunks: ImportInventoryRow[][] = [];
            for (let i = 0; i < rows.length; i += chunkSize) {
              chunks.push(rows.slice(i, i + chunkSize));
            }

            const startIndex = afterUser
              ? chunks.findIndex((chunk) => {
                  const last = chunk.at(-1);
                  return last
                    ? last.userId.localeCompare(afterUser, undefined, {
                        numeric: true,
                      }) > 0
                    : false;
                })
              : 0;

            if (startIndex === -1) {
              await itx.editReply("Nothing to import (all users already processed)");
              return;
            }

            let processed = 0;
            let lastProcessedUserId: string | undefined;

            for (let index = startIndex; index < chunks.length; index++) {
              const chunk = chunks[index];
              if (!chunk) continue;
              try {
                await importInventoryChunk(ctx.prisma, itx.guildId, itx.user.id, chunk);
              } catch (error) {
                await itx.editReply(
                  `Import failed. Last successfully processed user: ${lastProcessedUserId ?? "none"}. Rerun with after-user=${lastProcessedUserId ?? ""} to resume. Error: ${error}`,
                );
                return;
              }
              processed += chunk.length;
              lastProcessedUserId = chunk.at(-1)?.userId;
              await itx
                .editReply(
                  `Importing inventory... ${processed}/${rows.length} users (last user: ${lastProcessedUserId})`,
                )
                .catch(() => {});
            }

            await itx.editReply(`Imported inventory for ${processed} users`);
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
          .handle(async ({ privilegedIntentsEnabled }, __, itx) => {
            if (!privilegedIntentsEnabled) {
              return errorFollowUp(itx, PRIVILEGED_FEATURES_DISABLED_MESSAGE);
            }
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
