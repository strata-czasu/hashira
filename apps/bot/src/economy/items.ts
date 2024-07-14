import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { countDistinct, eq, isNull } from "@hashira/db/drizzle";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";
import { getItem } from "./util";

export const items = new Hashira({ name: "items" })
  .use(base)
  .group("item-admin", (group) =>
    group
      .setDescription("Zarządzanie przedmiotami")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("lista", (command) =>
        command
          .setDescription("Wyświetl listę przedmiotów")
          .handle(async ({ db }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const where = isNull(schema.item.deletedAt);
            const paginator = new DatabasePaginator({
              orderBy: [schema.item.createdAt],
              select: db.select().from(schema.item).where(where).$dynamic(),
              count: db
                .select({ count: countDistinct(schema.item.id) })
                .from(schema.item)
                .where(where)
                .$dynamic(),
            });
            const paginatedView = new PaginatedView(
              paginator,
              "Przedmioty",
              ({ id, name, description }) => `### ${name} [${id}]\n${description}`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Utwórz przedmiot")
          .addString("name", (name) => name.setDescription("Nazwa przedmiotu"))
          .addString("description", (name) => name.setDescription("Opis przedmiotu"))
          .addInteger("price", (name) =>
            name
              .setDescription(
                "Cena przedmiotu. Zostanie on automatycznie dodany do sklepu",
              )
              .setRequired(false),
          )
          .handle(async ({ db }, { name, description, price }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const created = await db.transaction(async (tx) => {
              const [item] = await tx
                .insert(schema.item)
                .values({
                  name,
                  description,
                  createdBy: itx.user.id,
                })
                .returning();
              if (!item) return false;
              if (price !== null) {
                await tx.insert(schema.shopItem).values({
                  itemId: item.id,
                  price: price,
                  createdBy: itx.user.id,
                });
              }
              return true;
            });
            if (!created) return;

            let message = `Utworzono przedmio ${bold(name)}`;
            if (price !== null) {
              message += ` i dodano go do sklepu za ${bold(price.toString())}`;
            }
            await itx.editReply(message);
          }),
      )
      .addCommand("edytuj", (command) =>
        command
          .setDescription("Edytuj przedmiot")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addString("name", (name) =>
            name.setDescription("Nowa nazwa przedmiotu").setRequired(false),
          )
          .addString("description", (name) =>
            name.setDescription("Nowy opis przedmiotu").setRequired(false),
          )
          .handle(async ({ db }, { id, name, description }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            if (!name && !description) {
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
          .setDescription("Usuń przedmiot")
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
                .set({ deletedAt: itx.createdAt })
                .where(eq(schema.item.id, id));
              await tx
                .update(schema.shopItem)
                .set({ deletedAt: itx.createdAt })
                .where(eq(schema.shopItem.itemId, id));
              return item;
            });
            if (!item) return;

            await itx.editReply(`Usunięto przedmiot ${inlineCode(id.toString())}`);
          }),
      ),
  );
