import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Item } from "@hashira/db";
import { PermissionFlagsBits, inlineCode } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { formatBalance, formatItem, getItem, getTypeNameForList } from "./util";

const formatItemInList = ({ id, name, description, type }: Item) => {
  const lines = [];
  lines.push(`### ${name} [${id}] ${getTypeNameForList(type)}`);
  if (description) lines.push(description);

  return lines.join("\n");
};

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
              formatItemInList,
              true,
              "T - tytuł profilu",
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("utwórz", (command) =>
        command
          .setDescription("Utwórz nowy przedmiot")
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
              await ensureUserExists(tx, itx.user);
              const item = await tx.item.create({
                data: {
                  name,
                  description,
                  createdBy: itx.user.id,
                  type: "item",
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
            // TODO)) Logs of item creation
          }),
      )
      .addCommand("utwórz-tytuł", (command) =>
        command
          .setDescription("Utwórz nowy tytuł")
          .addString("name", (name) => name.setDescription("Nazwa tytułu"))
          .addString("description", (description) =>
            description.setDescription("Opis tytułu").setRequired(false),
          )
          .handle(async ({ prisma }, { name, description }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(prisma, itx.user);
            const item = await prisma.item.create({
              data: {
                name,
                description,
                createdBy: itx.user.id,
                type: "profileTitle",
              },
            });
            if (!item) return;

            await itx.editReply(`Utworzono tytuł ${formatItem(item)}`);
            // TODO)) Logs of title creation
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
            // TODO)) Logs of item edits
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
            // TODO)) Logs of item deletion
          }),
      ),
  );
