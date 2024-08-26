import { ConfirmationDialog, Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type PrismaTransaction } from "@hashira/db";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { getItem } from "./util";

const getInventoryItem = async (tx: PrismaTransaction, id: number) =>
  tx.inventoryItem.findFirst({ where: { id, deletedAt: null } });

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

            // TODO)) Group items by type instead of listing all
            const where = { userId: user.id, deletedAt: null };

            const paginator = new DatabasePaginator(
              (props) =>
                prisma.inventoryItem.findMany({
                  where,
                  include: { item: true },
                  ...props,
                }),
              () => prisma.inventoryItem.count({ where }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              `Ekwipunek ${user.tag}`,
              ({ id, item }) => `- ${item.name} [${id}]`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription("Przekaż przedmiot innemu użytkownikowi")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w ekwipunku"))
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(
            async (
              { prisma, lock },
              { id: inventoryItemId, user: targetUser },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (targetUser.id === itx.user.id) {
                await errorFollowUp(
                  itx,
                  "Nie możesz przekazać przedmiotu samemu sobie!",
                );
                return;
              }

              await ensureUsersExist(prisma, [targetUser, itx.user]);
              // TODO)) Nicer confirmation message with item name
              const dialog = new ConfirmationDialog(
                `Czy na pewno chcesz przekazać ${inlineCode(
                  inventoryItemId.toString(),
                )} dla ${bold(targetUser.tag)}?`,
                "Tak",
                "Nie",
                async () => {
                  //  TODO: Use transaction from prisma
                  const inventoryItem = await prisma.$transaction(async (tx) => {
                    const inventoryItem = await tx.inventoryItem.findFirst({
                      where: { id: inventoryItemId, deletedAt: null },
                      include: { item: true },
                    });

                    if (!inventoryItem) {
                      await errorFollowUp(
                        itx,
                        "Nie znaleziono przedmiotu o podanym ID",
                      );
                      return null;
                    }

                    await tx.inventoryItem.update({
                      where: { id: inventoryItemId },
                      data: { deletedAt: itx.createdAt },
                    });

                    return inventoryItem;
                  });
                  if (!inventoryItem) return;
                  await itx.editReply({
                    content: `Przekazano ${bold(inventoryItem.item.name)} dla ${bold(
                      targetUser.tag,
                    )}`,
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
                [`inventory_item_transfer_${inventoryItemId}`],
                async () => dialog.render(itx),
                () =>
                  errorFollowUp(
                    itx,
                    "Masz już aktywne zapytanie o przekazanie tego przedmiotu!",
                  ),
              );
            },
          ),
      ),
  )
  .group("eq-admin", (group) =>
    group
      .setDescription("Komendy administracyjne ekwipunku")
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
            const added = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, itemId);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }

              await tx.inventoryItem.create({
                data: {
                  itemId,
                  userId: user.id,
                },
              });
              return true;
            });
            if (!added) return;

            await itx.editReply(
              `Dodano przedmiot ${inlineCode(itemId.toString())} do ekwipunku ${bold(
                user.tag,
              )}`,
            );
          }),
      )
      .addCommand("zabierz", (command) =>
        command
          .setDescription("Zabierz przedmiot z ekwipunku użytkownika")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w ekwipunku"))
          .handle(async ({ prisma }, { id: inventoryItemId }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const removed = await prisma.$transaction(async (tx) => {
              const inventoryItem = await getInventoryItem(tx, inventoryItemId);
              if (!inventoryItem) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }

              await tx.inventoryItem.update({
                where: { id: inventoryItemId, deletedAt: null },
                data: { deletedAt: itx.createdAt },
              });

              return true;
            });
            if (!removed) return;

            await itx.editReply(
              `Zabrano przedmiot ${inlineCode(inventoryItemId.toString())}.`,
            );
          }),
      ),
  );
