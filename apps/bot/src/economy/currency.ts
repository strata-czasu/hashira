import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { and, count, eq } from "@hashira/db/drizzle";
import { PermissionFlagsBits, TimestampStyles, time } from "discord.js";
import { base } from "../base";

const formatCurrency = (
  { name, symbol, createdAt, createdBy }: typeof schema.currency.$inferSelect,
  showOwner = false,
) => {
  const formattedTime = time(createdAt, TimestampStyles.LongDateTime);
  const base = `${name} - ${symbol} - ${formattedTime}`;

  return showOwner ? `${base} - <@${createdBy}>` : base;
};

export const currency = new Hashira({ name: "currency" })
  .use(base)
  .group("currency", (group) =>
    group
      .setDMPermission(false)
      .setDescription("Currency related commands")
      .addCommand("create", (createCommand) =>
        createCommand
          .setDescription("Create a new currency")
          .addString("name", (nameOption) =>
            nameOption.setDescription("The name of the currency"),
          )
          .addString("symbol", (symbolOption) =>
            symbolOption.setDescription("The symbol of the currency"),
          )
          .handle(async ({ db }, { name, symbol }, itx) => {
            if (!itx.inCachedGuild()) return;
            if (!itx.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
              await itx.reply("You don't have permission to create a currency!");
              return;
            }
            try {
              await db.insert(schema.currency).values({
                name,
                symbol,
                guildId: itx.guildId,
                createdBy: itx.user.id,
              });
            } catch (err) {
              await itx.reply("Currency with the same name or symbol already exists!");
              return;
            }

            await itx.reply("Currency created successfully!");
          }),
      )
      .addGroup("list", (listGroup) =>
        listGroup
          .setDescription("Commands to list currencies")
          .addCommand("user", (userCommand) =>
            userCommand
              .setDescription("List all currencies of certain user")
              .addUser("user", (userOption) =>
                userOption
                  .setDescription("The user to get stats for")
                  .setRequired(false),
              )
              .handle(async ({ db }, { user }, itx) => {
                if (!itx.inCachedGuild()) return;
                const userId = user?.id ?? itx.user.id;
                const guildId = itx.guildId;

                const where = and(
                  eq(schema.currency.createdBy, userId),
                  eq(schema.currency.guildId, guildId),
                );

                const paginate = new DatabasePaginator({
                  orderBy: schema.currency.createdAt,
                  select: db.select().from(schema.currency).where(where).$dynamic(),
                  count: db.select({ count: count() }).from(schema.currency).$dynamic(),
                });

                const paginator = new PaginatedView(
                  paginate,
                  "Currencies",
                  (item, idx) => `${idx}. ${formatCurrency(item)}`,
                );

                await paginator.render(itx);
              }),
          )
          .addCommand("guild", (guildCommand) =>
            guildCommand
              .setDescription("List all currencies of current guild")
              .handle(async ({ db }, _, itx) => {
                if (!itx.inCachedGuild()) return;

                const where = eq(schema.currency.guildId, itx.guildId);

                const paginate = new DatabasePaginator({
                  orderBy: schema.currency.createdAt,
                  select: db.select().from(schema.currency).where(where).$dynamic(),
                  count: db.select({ count: count() }).from(schema.currency).$dynamic(),
                });

                const paginator = new PaginatedView(
                  paginate,
                  "Currencies",
                  (item, idx) => `${idx}. ${formatCurrency(item, true)}`,
                );

                await paginator.render(itx);
              }),
          ),
      ),
  );
