import { ConfirmationDialog, Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Transaction, schema } from "@hashira/db";
import { and, count, eq, isNull } from "@hashira/db/drizzle";
import { PermissionFlagsBits, bold, inlineCode } from "discord.js";
import { base } from "../base";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { getItem } from "./util";

const getInventoryItem = async (tx: Transaction, id: number) => {
  const [inventoryItem] = await tx
    .select()
    .from(schema.inventoryItem)
    .where(
      and(eq(schema.inventoryItem.id, id), isNull(schema.inventoryItem.deletedAt)),
    );
  return inventoryItem;
};

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
          .handle(async ({ db }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            // TODO)) Group items by type instead of listing all
            const where = and(
              eq(schema.inventoryItem.userId, user.id),
              isNull(schema.inventoryItem.deletedAt),
            );
            const paginator = new DatabasePaginator({
              orderBy: [schema.inventoryItem.createdAt],
              select: db
                .select()
                .from(schema.inventoryItem)
                .innerJoin(schema.item, eq(schema.inventoryItem.itemId, schema.item.id))
                .where(where)
                .$dynamic(),
              count: db
                .select({ count: count(schema.inventoryItem) })
                .from(schema.inventoryItem)
                .where(where)
                .$dynamic(),
            });
            const paginatedView = new PaginatedView(
              paginator,
              `Ekwipunek ${user.tag}`,
              ({ inventory_item: { id }, item }) => `- ${item.name} [${id}]`,
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
            async ({ db, lock }, { id: inventoryItemId, user: targetUser }, itx) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (targetUser.id === itx.user.id) {
                await errorFollowUp(
                  itx,
                  "Nie możesz przekazać przedmiotu samemu sobie!",
                );
                return;
              }

              await ensureUsersExist(db, [targetUser, itx.user]);
              // TODO)) Nicer confirmation message with item name
              const dialog = new ConfirmationDialog(
                `Czy na pewno chcesz przekazać ${inlineCode(
                  inventoryItemId.toString(),
                )} dla ${bold(targetUser.tag)}?`,
                "Tak",
                "Nie",
                async () => {
                  const inventoryItem = await db.transaction(async (tx) => {
                    const [inventoryItem] = await tx
                      .select()
                      .from(schema.inventoryItem)
                      .innerJoin(
                        schema.item,
                        eq(schema.inventoryItem.itemId, schema.item.id),
                      )
                      .where(
                        and(
                          eq(schema.inventoryItem.id, inventoryItemId),
                          eq(schema.inventoryItem.userId, itx.user.id),
                          isNull(schema.inventoryItem.deletedAt),
                        ),
                      );
                    if (!inventoryItem) {
                      await errorFollowUp(
                        itx,
                        "Nie znaleziono przedmiotu o podanym ID",
                      );
                      return null;
                    }

                    await tx
                      .update(schema.inventoryItem)
                      .set({ userId: targetUser.id })
                      .where(and(eq(schema.inventoryItem.id, inventoryItemId)));
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
          .handle(async ({ db }, { id: itemId, user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(db, user);
            const added = await db.transaction(async (tx) => {
              const item = await getItem(tx, itemId);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }
              await tx.insert(schema.inventoryItem).values({
                itemId,
                userId: user.id,
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
          .handle(async ({ db }, { id: inventoryItemId }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const removed = await db.transaction(async (tx) => {
              const inventoryItem = await getInventoryItem(tx, inventoryItemId);
              if (!inventoryItem) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }
              await tx
                .update(schema.inventoryItem)
                .set({ deletedAt: itx.createdAt })
                .where(
                  and(
                    eq(schema.inventoryItem.id, inventoryItemId),
                    isNull(schema.inventoryItem.deletedAt),
                  ),
                )
                .returning();
              return true;
            });
            if (!removed) return;

            await itx.editReply(
              `Zabrano przedmiot ${inlineCode(inventoryItemId.toString())}.`,
            );
          }),
      ),
  );
