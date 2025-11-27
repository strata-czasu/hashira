import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import { PermissionFlagsBits } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import {
  InsufficientBalanceError,
  OutOfStockError,
  ShopItemNotFoundError,
  UserPurchaseLimitExceededError,
} from "./economyError";
import { getCurrency } from "./managers/currencyManager";
import {
  getRemainingStock,
  purchaseShopItem,
  type ShopItemWithDetails,
} from "./managers/shopService";
import {
  formatBalance,
  formatItem,
  getItem,
  getShopItem,
  getTypeNameForList,
} from "./util";

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
  return divideAndRound(amount, 1);
};

const formatStockInfo = (shopItem: ShopItemWithDetails): string => {
  const remaining = getRemainingStock(shopItem);
  if (remaining === null) return "";
  if (remaining === 0) return " Wyprzedane";
  return ` (${remaining}/${shopItem.globalStock})`;
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
                  where: { deletedAt: null, item: { guildId: itx.guildId } },
                  orderBy: { price },
                  include: { item: true, currency: true },
                }),
              () =>
                prisma.shopItem.count({
                  where: { deletedAt: null, item: { guildId: itx.guildId } },
                }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Sklep",
              (shopItem) => {
                const { id, price, item, currency } = shopItem;
                const { name, description, type } = item;
                const stockInfo = formatStockInfo(shopItem);
                const lines = [];
                lines.push(
                  `### ${name} - ${formatAmount(price)}${currency.symbol}${stockInfo} [${id}] ${getTypeNameForList(type)}`,
                );
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
          .addInteger("przedmiot", (przedmiot) =>
            przedmiot.setDescription("Przedmiotu ze sklepu").setAutocomplete(true),
          )
          .addInteger("ilość", (amount) =>
            amount
              .setDescription("Ilość przedmiotów")
              .setRequired(false)
              .setMinValue(1),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            const results = await prisma.shopItem.findMany({
              where: {
                deletedAt: null,
                item: {
                  guildId: itx.guildId,
                  name: {
                    contains: itx.options.getFocused(),
                    mode: "insensitive",
                  },
                },
              },
              include: { item: true },
            });
            await itx.respond(
              results.map(({ id, price, item }) => ({
                value: id,
                name: `${item.name} - ${formatAmount(price)} ${getTypeNameForList(item.type)}`,
              })),
            );
          })
          .handle(async ({ prisma }, { przedmiot: id, ilość: rawAmount }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(prisma, itx.user.id);

            const quantity = rawAmount ?? 1;

            try {
              const result = await purchaseShopItem({
                prisma,
                shopItemId: id,
                userId: itx.user.id,
                guildId: itx.guildId,
                quantity,
              });

              const { shopItem, totalPrice } = result;
              const quantityText = quantity > 1 ? ` x${quantity}` : "";
              await itx.editReply(
                `Kupiono **${shopItem.item.name}**${quantityText} za ${formatBalance(totalPrice, shopItem.currency.symbol)}`,
              );
            } catch (error) {
              if (error instanceof ShopItemNotFoundError) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu w sklepie");
              } else if (error instanceof OutOfStockError) {
                await errorFollowUp(itx, "Przedmiot jest wyprzedany");
              } else if (error instanceof UserPurchaseLimitExceededError) {
                await errorFollowUp(
                  itx,
                  `Osiągnięto limit zakupów tego przedmiotu (${error.currentQuantity}/${error.limit})`,
                );
              } else if (error instanceof InsufficientBalanceError) {
                await errorFollowUp(itx, "Nie masz wystarczająco środków");
              } else {
                throw error;
              }
            }
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

            const item = await getItem(prisma, id, itx.guildId);
            if (!item) {
              await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
              return;
            }

            const currency = await getCurrency({
              prisma,
              guildId: itx.guildId,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
            });

            await prisma.shopItem.create({
              data: {
                itemId: id,
                currencyId: currency.id,
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

            const shopItem = await getShopItem(prisma, id, itx.guildId);
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

            const shopItem = await getShopItem(prisma, id, itx.guildId);
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
