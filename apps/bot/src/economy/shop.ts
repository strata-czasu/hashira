import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { and, countDistinct, eq, isNotNull, isNull } from "@hashira/db/drizzle";
import { PermissionFlagsBits, inlineCode } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { addBalance } from "./managers/transferManager";
import { getDefaultWallet } from "./managers/walletManager";
import { formatBalance } from "./strata/strataCurrency";
import { getItem, getShopItem } from "./util";

const formatAmount = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
};

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

            const where = and(
              isNotNull(schema.shopItem.price),
              isNull(schema.shopItem.deletedAt),
            );
            const paginator = new DatabasePaginator({
              orderBy: [schema.shopItem.price],
              select: db
                .select()
                .from(schema.shopItem)
                .innerJoin(schema.item, eq(schema.shopItem.itemId, schema.item.id))
                .where(where)
                .$dynamic(),
              count: db
                .select({ count: countDistinct(schema.shopItem.id) })
                .from(schema.shopItem)
                .where(where)
                .$dynamic(),
            });
            const paginatedView = new PaginatedView(
              paginator,
              "Sklep",
              ({ shop_item: { id, price }, item: { name, description } }) =>
                `### ${name} - ${formatAmount(price as number)} [${id}]\n${description}`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("kup", (command) =>
        command
          .setDescription("Kup przedmiot ze sklepu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .handle(async ({ db }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            ensureUserExists(db, itx.user.id);

            const success = await db.transaction(async (tx) => {
              const shopItem = await getShopItem(tx, id);
              if (!shopItem) {
                await errorFollowUp(
                  itx,
                  "Nie znaleziono przedmiotu w sklepie o podanym ID",
                );
                return false;
              }

              const wallet = await getDefaultWallet({
                db: tx,
                userId: itx.user.id,
                guildId: itx.guild.id,
                currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              });

              if (wallet.balance < shopItem.price) {
                const missing = shopItem.price - wallet.balance;
                await errorFollowUp(
                  itx,
                  `Nie masz wystarczająco punktów. Brakuje Ci ${formatBalance(missing, STRATA_CZASU_CURRENCY.symbol)}`,
                );
                return false;
              }

              await addBalance({
                db: tx,
                currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                guildId: itx.guild.id,
                toUserId: itx.user.id,
                amount: -shopItem.price,
                reason: `Zakup przedmiotu ${shopItem.id}`,
              });

              await tx.insert(schema.inventoryItem).values({
                itemId: shopItem.itemId,
                userId: itx.user.id,
              });

              return true;
            });

            if (!success) return;

            await itx.editReply("Kupiono przedmiot ze sklepu");
          }),
      ),
  )
  .group("sklep-admin", (group) =>
    group
      .setDescription("Zarządzanie sklepem")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addCommand("wystaw", (command) =>
        command
          .setDescription("Wystaw przedmiot w sklepie")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu"))
          .addInteger("price", (price) => price.setDescription("Cena przedmiotu"))
          .handle(async ({ db }, { id, price }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await db.transaction(async (tx) => {
              const item = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }
              await tx
                .insert(schema.shopItem)
                .values({
                  itemId: item.id,
                  price,
                  createdBy: itx.user.id,
                })
                .returning();
              return item;
            });
            if (!item) return;

            await itx.editReply(`Wystawiono ${item.name} za ${formatAmount(price)}`);
          }),
      )
      .addCommand("zdejmij", (command) =>
        command
          .setDescription("Usuń przedmiot ze sklepu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .handle(async ({ db }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const removed = await db.transaction(async (tx) => {
              const shopItem = await getShopItem(tx, id);
              if (!shopItem) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }
              await tx
                .update(schema.shopItem)
                .set({ deletedAt: itx.createdAt })
                .where(eq(schema.shopItem.id, id))
                .returning();
              return true;
            });
            if (!removed) return;

            await itx.editReply("Przedmiot usunięty ze sklepu");
          }),
      )
      .addCommand("edytuj", (command) =>
        command
          .setDescription("Zmień cenę przedmiotu w sklepie")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .addInteger("price", (price) => price.setDescription("Nowa cena przedmiotu"))
          .handle(async ({ db }, { id, price }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const updated = await db.transaction(async (tx) => {
              const shopItem = await getShopItem(tx, id);
              if (!shopItem) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }
              await tx
                .update(schema.shopItem)
                .set({ price, editedAt: itx.createdAt })
                .where(eq(schema.shopItem.id, id))
                .returning();
              return true;
            });
            if (!updated) return;

            await itx.editReply(
              `Zaktualizowano cenę przedmiotu ${inlineCode(id.toString())}`,
            );
          }),
      ),
  );
