import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { countDistinct, isNull } from "@hashira/db/drizzle";
import { PermissionFlagsBits, bold } from "discord.js";
import { base } from "../base";

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

            // TODO)) Impl
            await itx.editReply(`Edytuj przedmiot ${id}`);
          }),
      )
      .addCommand("usun", (command) =>
        command
          .setDescription("Usuń przedmiot ze sklepu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .handle(async ({ db }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            // TODO)) Impl
            await itx.editReply(`Usunięto przedmiot ${id} do sklepu`);
          }),
      ),
  );
