import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Item, type Prisma } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { bold, inlineCode, PermissionFlagsBits } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { getCurrency } from "./managers/currencyManager";
import { formatBalance, formatItem, getItem, getTypeNameForList } from "./util";

const formatItemInList = ({ id, name, description, type, perUserLimit }: Item) => {
  const lines = [];
  lines.push(`### ${name} [${id}] ${getTypeNameForList(type)}`);
  if (description) lines.push(description);
  if (perUserLimit !== null) lines.push(`Limit na użytkownika: ${perUserLimit}`);

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
          .addString("description", (description) =>
            description.setDescription("Opis przedmiotu"),
          )
          .addInteger("limit", (limit) =>
            limit
              .setDescription("Limit na użytkownika (domyślnie nieskończony)")
              .setRequired(false)
              .setMinValue(1),
          )
          .addInteger("price", (price) =>
            price
              .setDescription(
                "Cena przedmiotu. Zostanie on automatycznie dodany do sklepu",
              )
              .setRequired(false),
          )
          .handle(async ({ prisma }, { name, description, limit, price }, itx) => {
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
                  perUserLimit: limit,
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
                perUserLimit: 1,
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
                perUserLimit: 1,
                badge: {
                  create: {
                    image: new Uint8Array(await imageData.arrayBuffer()),
                  },
                },
              },
            });

            await itx.editReply(`Utworzono odznakę ${formatItem(item)}`);
            // TODO)) Logs of badge creation
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
            const item = await prisma.item.create({
              data: {
                name,
                guildId: itx.guildId,
                createdBy: itx.user.id,
                type: "staticTintColor",
                perUserLimit: 1,
                tintColor: {
                  create: {
                    color,
                  },
                },
              },
            });

            await itx.editReply(`Utworzono kolor ${formatItem(item)} - ${bold(hex)}`);
            // TODO)) Logs of color creation
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
          .addInteger("limit", (limit) =>
            limit
              .setDescription("Nowy limit na użytkownika (0 = usuń limit)")
              .setRequired(false)
              .setMinValue(0),
          )
          .handle(async ({ prisma }, { id, name, description, limit }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            if (!name && !description && limit === null) {
              await errorFollowUp(itx, "Podaj przynajmniej jedną wartość do edycji");
              return;
            }

            const updateData: Prisma.ItemUpdateInput = { editedAt: itx.createdAt };
            if (name !== null) updateData.name = name;
            if (description !== null) updateData.description = description;
            if (limit !== null) updateData.perUserLimit = limit === 0 ? null : limit;

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, id, itx.guildId);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }

              return tx.item.update({
                where: { id },
                data: updateData,
              });
            });
            if (!item) return;

            await itx.editReply(`Edytowano przedmiot ${inlineCode(id.toString())}`);
            // TODO)) Logs of item edits
          }),
      )
      .addCommand("edytuj-odznakę", (command) =>
        command
          .setDescription("Edytuj obrazek odznaki profilu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addAttachment("image", (image) =>
            image.setDescription("Nowy obrazek odznaki (PNG, 128x128px)"),
          )
          .handle(async ({ prisma }, { id, image }, itx) => {
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

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, id, itx.guildId);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono odznaki o podanym ID");
                return null;
              }

              return tx.item.update({
                where: { id },
                data: {
                  badge: {
                    update: {
                      image: new Uint8Array(await imageData.arrayBuffer()),
                    },
                  },
                },
              });
            });
            if (!item) return;

            await itx.editReply(
              `Edytowano obrazek odznaki ${inlineCode(id.toString())}`,
            );
            // TODO)) Logs of item edits
          }),
      )
      .addCommand("usuń", (command) =>
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
