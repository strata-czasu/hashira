import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Item } from "@hashira/db";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { errorFollowUp } from "../util/errorFollowUp";
import { formatBalance, getItem } from "./util";

const formatItem = ({ name, id }: Item) =>
  `${bold(name)} [${inlineCode(id.toString())}]`;

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
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const where = { deletedAt: null };

            const paginator = new DatabasePaginator(
              (props) => prisma.item.findMany({ where, ...props }),
              () => prisma.item.count({ where }),
            );

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
          .handle(async ({ prisma }, { name, description, price }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await prisma.$transaction(async (tx) => {
              const item = await tx.item.create({
                data: {
                  name,
                  description,
                  createdBy: itx.user.id,
                },
              });

              if (!item) return null;
              if (price !== null) {
                await tx.shopItem.create({
                  data: {
                    item: { connect: { id: item.id } },
                    price,
                    creator: { connect: { id: itx.user.id } },
                  },
                });
              }
              return item;
            });
            if (!item) return;

            let message = `Utworzono przedmiot ${formatItem(item)}`;
            if (price !== null) {
              message += ` i dodano go do sklepu za ${formatBalance(price, STRATA_CZASU_CURRENCY.symbol)}`;
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
          .handle(async ({ prisma }, { id, name, description }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            if (!name && !description) {
              await errorFollowUp(itx, "Podaj przynajmniej jedną wartość do edycji");
              return;
            }

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }

              await tx.item.update({
                where: { id },
                data: {
                  name: name ?? item.name,
                  description: description ?? item.description,
                },
              });
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
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }

              await tx.item.update({
                where: { id },
                data: { deletedAt: itx.createdAt },
              });

              await tx.shopItem.updateMany({
                where: { item },
                data: { deletedAt: itx.createdAt },
              });

              return item;
            });
            if (!item) return;

            await itx.editReply(`Usunięto przedmiot ${inlineCode(id.toString())}`);
          }),
      ),
  );
