import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
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
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const paginator = new DatabasePaginator(
              (props, price) =>
                prisma.shopItem.findMany({
                  ...props,
                  orderBy: { price },
                  include: { item: true },
                }),
              () => prisma.shopItem.count(),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Sklep",
              ({ id, price, item: { name, description } }) =>
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
          .addInteger("ilość", (amount) =>
            amount
              .setDescription("Ilość przedmiotów")
              .setRequired(false)
              .setMinValue(1),
          )
          .handle(async ({ prisma }, { id, ilość: rawAmount }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(prisma, itx.user.id);

            const amount = rawAmount ?? 1;

            const success = await prisma.$transaction(async (tx) => {
              const shopItem = await getShopItem(tx, id);
              if (!shopItem) {
                await errorFollowUp(
                  itx,
                  "Nie znaleziono przedmiotu w sklepie o podanym ID",
                );
                return false;
              }

              const allItemsPrice = shopItem.price * amount;

              const wallet = await getDefaultWallet({
                prisma: nestedTransaction(tx),
                userId: itx.user.id,
                guildId: itx.guild.id,
                currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              });

              if (wallet.balance < allItemsPrice) {
                const missing = allItemsPrice - wallet.balance;
                await errorFollowUp(
                  itx,
                  `Nie masz wystarczająco punktów. Brakuje Ci ${formatBalance(missing, STRATA_CZASU_CURRENCY.symbol)}`,
                );
                return false;
              }

              await addBalance({
                prisma: nestedTransaction(tx),
                currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                guildId: itx.guild.id,
                toUserId: itx.user.id,
                amount: -allItemsPrice,
                reason: `Zakup przedmiotu ${shopItem.id}`,
              });

              const items = new Array<Prisma.InventoryItemCreateManyInput>(amount).fill(
                { itemId: shopItem.itemId, userId: itx.user.id },
              );
              await tx.inventoryItem.createMany({ data: items });

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
          .handle(async ({ prisma }, { id, price }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(tx, id);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return null;
              }

              await tx.shopItem.create({
                data: {
                  itemId: id,
                  price,
                  createdBy: itx.user.id,
                },
              });

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
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const removed = await prisma.$transaction(async (tx) => {
              const shopItem = await getShopItem(tx, id);
              if (!shopItem) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }

              await tx.shopItem.update({
                where: { id },
                data: { deletedAt: itx.createdAt },
              });

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
          .handle(async ({ prisma }, { id, price }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const updated = await prisma.$transaction(async (tx) => {
              const shopItem = await getShopItem(tx, id);
              if (!shopItem) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return false;
              }

              await tx.shopItem.update({
                where: { id },
                data: { price, editedAt: itx.createdAt },
              });

              return true;
            });
            if (!updated) return;

            await itx.editReply(
              `Zaktualizowano cenę przedmiotu ${inlineCode(id.toString())}`,
            );
          }),
      ),
  );
