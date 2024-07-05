import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Transaction, schema } from "@hashira/db";
import { and, countDistinct, eq, isNull } from "@hashira/db/drizzle";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";

const getItem = async (tx: Transaction, id: number) =>
  tx
    .select()
    .from(schema.shopItem)
    .where(and(eq(schema.shopItem.id, id), isNull(schema.shopItem.deletedAt)));

// TODO)) Inventory management
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

            const where = isNull(schema.shopItem.deletedAt);
            const paginator = new DatabasePaginator({
              orderBy: [schema.shopItem.price],
              select: db.select().from(schema.shopItem).where(where).$dynamic(),
              count: db
                .select({ count: countDistinct(schema.shopItem.id) })
                .from(schema.shopItem)
                .where(where)
                .$dynamic(),
            });
            const paginatedView = new PaginatedView(
              paginator,
              "Sklep",
              ({ id, name, price, description }) =>
                `### ${name} - ${price} [${id}]\n${description}`,
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
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Dodaj przedmiot do sklepu")
          .addString("name", (name) => name.setDescription("Nazwa przedmiotu"))
          .addInteger("price", (name) => name.setDescription("Cena przedmiotu"))
          .addString("description", (name) => name.setDescription("Opis przedmiotu"))
          .handle(async ({ db }, { name, price, description }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await db.insert(schema.shopItem).values({
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
              const [item] = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }
              await tx
                .update(schema.shopItem)
                .set({
                  name: name ?? item.name,
                  price: price ?? item.price,
                  description: description ?? item.description,
                })
                .where(eq(schema.shopItem.id, id));
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
              const [item] = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }
              await tx
                .update(schema.shopItem)
                .set({ deletedAt: new Date() })
                .where(eq(schema.shopItem.id, id));
              return item;
            });
            if (!item) return;

            await itx.editReply(
              `Usunięto przedmiot ${inlineCode(id.toString())} ze sklepu`,
            );
          }),
      ),
  );
