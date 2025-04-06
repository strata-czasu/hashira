import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { PermissionFlagsBits } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { addBalance } from "./managers/transferManager";
import { getDefaultWallet } from "./managers/walletManager";
import { formatBalance, formatItem, getItem, getShopItem } from "./util";

/**
 * Format amount to K/M, keeping up to one decimal if needed
 */
const formatAmount = (amount: number) => {
  const divideAndRound = (num: number, divisor: number) => {
    const divided = num / divisor;
    return divided % 1 ? divided.toFixed(1) : divided.toFixed(0);
  };

  if (amount >= 1_000_000) return `${divideAndRound(amount, 1_000_000)}M`;
  if (amount >= 1_000) return `${divideAndRound(amount, 1_000)}K`;
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
              ({ id, price, item: { name, description, type } }) => {
                let typeName = "";
                if (type === "profileTitle") typeName = "(T)";

                const lines = [];
                lines.push(`### ${name} - ${formatAmount(price)} [${id}] ${typeName}`);
                if (description) lines.push(description);

                return lines.join("\n");
              },
              true,
              "T - tytuł profilu",
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
                  "Nie znaleziono przedmiotu o podanym ID w sklepie",
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

            const item = await getItem(prisma, id);
            if (!item) {
              await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
              return;
            }

            await prisma.shopItem.create({
              data: {
                itemId: id,
                price,
                createdBy: itx.user.id,
              },
            });

            await itx.editReply(
              `Wystawiono ${formatItem(item)} za ${formatBalance(price, STRATA_CZASU_CURRENCY.symbol)}`,
            );
          }),
      )
      .addCommand("usuń", (command) =>
        command
          .setDescription("Usuń przedmiot ze sklepu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const shopItem = await getShopItem(prisma, id);
            if (!shopItem) {
              await errorFollowUp(
                itx,
                "Nie znaleziono przedmiotu w sklepie o podanym ID",
              );
              return;
            }

            await prisma.shopItem.update({
              where: { id },
              data: { deletedAt: itx.createdAt },
            });

            await itx.editReply(`Usunięto ${formatItem(shopItem.item)} ze sklepu`);
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

            const shopItem = await getShopItem(prisma, id);
            if (!shopItem) {
              await errorFollowUp(
                itx,
                "Nie znaleziono przedmiotu w sklepie o podanym ID",
              );
              return;
            }

            await prisma.shopItem.update({
              where: { id },
              data: { price, editedAt: itx.createdAt },
            });

            await itx.editReply(
              `Zmieniono cenę ${formatItem(shopItem.item)} na ${formatBalance(price, STRATA_CZASU_CURRENCY.symbol)}`,
            );
          }),
      ),
  );
