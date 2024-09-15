import { ConfirmationDialog, Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { getInventoryItem, getItem } from "./util";

export const inventory = new Hashira({ name: "inventory" })
  .use(base)
  .group("eq", (group) =>
    group
      .setDescription("Ekwipunek")
      .setDMPermission(false)
      .addCommand("user", (command) =>
        command
          .setDescription("Wyświetl ekwipunek użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const items = await prisma.item.findMany({
              select: { id: true, name: true },
              where: { deletedAt: null },
            });
            const itemNames = new Map(items.map((item) => [item.id, item.name]));

            const where = { userId: user.id, deletedAt: null };
            const paginator = new DatabasePaginator(
              (props, ordering) =>
                prisma.inventoryItem.groupBy({
                  by: "itemId",
                  where,
                  _count: true,
                  orderBy: [{ _count: { itemId: ordering } }, { itemId: ordering }],
                  ...props,
                }),
              async () => {
                const count = await prisma.inventoryItem.groupBy({
                  by: "itemId",
                  where,
                });
                return count.length;
              },
            );

            const paginatedView = new PaginatedView(
              paginator,
              `Ekwipunek ${user.tag}`,
              ({ _count, itemId }) => {
                const idString = `[${inlineCode(itemId.toString())}]`;
                const itemName =
                  itemNames.get(itemId) ?? `Nieznany przedmiot ${idString}`;
                if (_count === 1) return `- ${itemName} ${idString}`;
                return `- ${itemName} (x${bold(_count.toString())}) ${idString}`;
              },
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription("Przekaż przedmiot innemu użytkownikowi")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ prisma, lock }, { id: itemId, user: targetUser }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            if (targetUser.id === itx.user.id) {
              return await errorFollowUp(
                itx,
                "Nie możesz przekazać przedmiotu samemu sobie!",
              );
            }

            const item = await getItem(prisma, itemId);
            if (!item) {
              return await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
            }

            await ensureUsersExist(prisma, [targetUser, itx.user]);
            const dialog = new ConfirmationDialog(
              `Czy na pewno chcesz przekazać ${bold(item.name)} [${inlineCode(
                itemId.toString(),
              )}] dla ${bold(targetUser.tag)}?`,
              "Tak",
              "Nie",
              async () => {
                const inventoryItem = await prisma.$transaction(async (tx) => {
                  const inventoryItem = await getInventoryItem(tx, itemId, itx.user.id);
                  if (!inventoryItem) {
                    await errorFollowUp(itx, `Nie posiadasz ${bold(item.name)}`);
                    return null;
                  }

                  await tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { userId: targetUser.id },
                  });

                  return inventoryItem;
                });
                if (!inventoryItem) return;
                await itx.editReply({
                  content: `Przekazano ${bold(item.name)} dla ${bold(targetUser.tag)}`,
                  components: [],
                });
              },
              async () => {
                await itx.editReply({
                  content: "Anulowano przekazywanie przedmiotu.",
                  components: [],
                });
              },
              (action) => action.user.id === itx.user.id,
            );

            await lock.run(
              [`inventory_item_transfer_${itx.user.id}_${itemId}`],
              async () => dialog.render(itx),
              () =>
                errorFollowUp(itx, "Jesteś już w trakcie przekazania tego przedmiotu!"),
            );
          }),
      ),
  )
  .group("eq-admin", (group) =>
    group
      .setDescription("Komendy administracyjne ekwipunków")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Dodaj przedmiot do ekwipunku użytkownika")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ prisma }, { id: itemId, user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(prisma, user);
            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, itemId);
              if (!item) {
                await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
                return null;
              }

              await tx.inventoryItem.create({
                data: {
                  itemId,
                  userId: user.id,
                },
              });
              return item;
            });
            if (!item) return;

            await itx.editReply(
              `Dodano ${bold(item.name)} do ekwipunku ${bold(user.tag)}`,
            );
          }),
      )
      .addCommand("zabierz", (command) =>
        command
          .setDescription("Zabierz przedmiot z ekwipunku użytkownika")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ prisma }, { id: itemId, user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(prisma, itemId);
              if (!item) {
                return await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
              }

              const inventoryItem = await getInventoryItem(tx, itemId, user.id);
              if (!inventoryItem) {
                await errorFollowUp(
                  itx,
                  `${bold(user.tag)} nie posiada ${bold(item.name)}`,
                );
                return null;
              }

              await tx.inventoryItem.update({
                where: { id: inventoryItem.id, deletedAt: null },
                data: { deletedAt: itx.createdAt },
              });

              return item;
            });
            if (!item) return;

            await itx.editReply(
              `Usunięto ${bold(item.name)} z ekwipunku ${bold(user.tag)}.`,
            );
          }),
      ),
  );
