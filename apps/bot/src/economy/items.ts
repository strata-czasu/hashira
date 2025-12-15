import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Item, type Prisma } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { bold, inlineCode, italic, PermissionFlagsBits } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { getCurrency } from "./managers/currencyManager";
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

            const where: Prisma.ItemWhereInput = {
              deletedAt: null,
              guildId: itx.guildId,
            };

            const paginator = new DatabasePaginator(
              (props) => prisma.item.findMany({ where, ...props }),
              () => prisma.item.count({ where }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Przedmioty",
              formatItemInList,
              true,
              "T - tytuł profilu, O - odznaka",
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
                  guildId: itx.guildId,
                  createdBy: itx.user.id,
                  type: "item",
                  name,
                  description,
                },
              });

              if (!item) return null;
              if (price !== null) {
                const currency = await getCurrency({
                  prisma: nestedTransaction(tx),
                  guildId: itx.guildId,
                  currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                });
                await tx.shopItem.create({
                  data: {
                    item: { connect: { id: item.id } },
                    currency: { connect: { id: currency.id } },
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
          .setDescription("Utwórz nowy tytuł profilu")
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
                guildId: itx.guildId,
                createdBy: itx.user.id,
                type: "profileTitle",
              },
            });

            await itx.editReply(`Utworzono tytuł ${formatItem(item)}`);
            // TODO)) Logs of title creation
          }),
      )
      .addCommand("utwórz-odznakę", (command) =>
        command
          .setDescription("Utwórz nową odznakę profilu")
          .addString("name", (name) => name.setDescription("Nazwa odznaki"))
          .addAttachment("image", (image) =>
            image.setDescription("Obrazek odznaki (PNG, 128x128px)"),
          )
          .handle(async ({ prisma }, { name, image }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            if (image.contentType !== "image/png") {
              await itx.editReply("Obrazek odznaki musi być w formacie PNG!");
              return;
            }
            if (image.width !== 128 || image.height !== 128) {
              await itx.editReply("Obrazek odznaki musi mieć rozmiar 128x128px!");
              return;
            }

            const imageData = await fetch(image.url);

            await ensureUserExists(prisma, itx.user);
            const item = await prisma.item.create({
              data: {
                name,
                guildId: itx.guildId,
                createdBy: itx.user.id,
                type: "badge",
                badge: {
                  create: {
                    image: new Uint8Array(await imageData.arrayBuffer()),
                  },
                },
              },
            });

            await itx.editReply(
              `Utworzono nową odznakę ${italic(name)} [${inlineCode(item.id.toString())}]`,
            );
          }),
      )
      .addCommand("utwórz-kolor", (command) =>
        command
          .setDescription("Utwórz nowy kolor profilu")
          .addString("name", (name) => name.setDescription("Nazwa koloru"))
          .addString("hex", (hex) => hex.setDescription("Hex koloru (np. #ff5632)"))
          .handle(async ({ prisma }, { name, hex }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const color = Bun.color(hex, "number");
            if (!color) {
              return await errorFollowUp(itx, "Podany kolor nie jest poprawny!");
            }

            await ensureUserExists(prisma, itx.user);
            const item = await prisma.tintColor.create({
              data: {
                item: {
                  create: {
                    name,
                    guildId: itx.guildId,
                    createdBy: itx.user.id,
                    type: "staticTintColor",
                  },
                },
                color,
              },
            });

            await itx.editReply(
              `Utworzono nowy kolor ${italic(name)} (${bold(hex)}) [${inlineCode(item.id.toString())}]`,
            );
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
              const item = await getItem(tx, id, itx.guildId);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }

              return tx.item.update({
                where: { id },
                data: {
                  name: name ?? item.name,
                  description: description ?? item.description,
                },
              });
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
              const item = await getItem(tx, id, itx.guildId);
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
