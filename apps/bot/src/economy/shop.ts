import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { countDistinct, eq, isNull } from "@hashira/db/drizzle";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";
import { getItem } from "./util";

const formatAmount = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
};

export const shop = new Hashira({ name: "shop" })
  .use(base)
  .group("sklep", (group) =>
    group
      .setDescription("Komendy sklepu")
      .setDMPermission(false)
      .addCommand("lista", (command) =>
        command
          .setDescription("Wyświetl listę przedmiotów w sklepie")
          .handle(async ({ db }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const where = isNull(schema.item.deletedAt);
            const paginator = new DatabasePaginator({
              orderBy: [schema.item.price],
              select: db.select().from(schema.item).where(where).$dynamic(),
              count: db
                .select({ count: countDistinct(schema.item.id) })
                .from(schema.item)
                .where(where)
                .$dynamic(),
            });
            const paginatedView = new PaginatedView(
              paginator,
              "Sklep",
              ({ id, name, price, description }) =>
                `### ${name} - ${formatAmount(price)} [${id}]\n${description}`,
              true,
            );
            await paginatedView.render(itx);
            // TODO)) /sklep kup id
          }),
      ),
  )
  .group("sklep-admin", (group) =>
    group
      .setDescription("Komendy administracyjne sklepu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Dodaj przedmiot do sklepu")
          .addString("name", (name) => name.setDescription("Nazwa przedmiotu"))
          .addInteger("price", (name) => name.setDescription("Cena przedmiotu"))
          .addString("description", (name) => name.setDescription("Opis przedmiotu"))
          .handle(async ({ db }, { name, price, description }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await db.insert(schema.item).values({
              name,
              price,
              description,
              createdBy: itx.user.id,
            });
            await itx.editReply(
              `Dodano przedmiot ${bold(name)} o cenie ${bold(
                price.toString(),
              )} do sklepu.`,
            );
          }),
      )
      .addCommand("edytuj", (command) =>
        command
          .setDescription("Edytuj przedmiot w sklepie")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addString("name", (name) =>
            name.setDescription("Nowa nazwa przedmiotu").setRequired(false),
          )
          .addInteger("price", (name) =>
            name.setDescription("Nowa cena przedmiotu").setRequired(false),
          )
          .addString("description", (name) =>
            name.setDescription("Nowy opis przedmiotu").setRequired(false),
          )
          .handle(async ({ db }, { id, name, price, description }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            if (!name && !price && !description) {
              await errorFollowUp(itx, "Podaj przynajmniej jedną wartość do edycji");
              return;
            }

            const item = await db.transaction(async (tx) => {
              const item = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }
              await tx
                .update(schema.item)
                .set({
                  name: name ?? item.name,
                  price: price ?? item.price,
                  description: description ?? item.description,
                })
                .where(eq(schema.item.id, id));
              return item;
            });
            if (!item) return;

            await itx.editReply(`Edytowano przedmiot ${inlineCode(id.toString())}`);
          }),
      )
      .addCommand("usun", (command) =>
        command
          .setDescription("Usuń przedmiot ze sklepu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .handle(async ({ db }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await db.transaction(async (tx) => {
              const item = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }
              await tx
                .update(schema.item)
                .set({ deletedAt: new Date() })
                .where(eq(schema.item.id, id));
              return item;
            });
            if (!item) return;

            await itx.editReply(
              `Usunięto przedmiot ${inlineCode(id.toString())} ze sklepu`,
            );
          }),
      ),
  );
