/** @jsxImportSource @hashira/jsx */
import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import { Button, H3, Section, TextDisplay } from "@hashira/jsx";
import { ButtonStyle, HeadingLevel, heading, PermissionFlagsBits } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import {
  InsufficientBalanceError,
  InvalidAmountError,
  InvalidStockError,
  OutOfStockError,
  ShopItemNotFoundError,
  UserPurchaseLimitExceededError,
} from "./economyError";
import {
  createShopItem,
  deleteShopItem,
  getRemainingStock,
  getShopItemWithDetails,
  purchaseShopItem,
  type ShopItemChanges,
  type ShopItemWithDetails,
  updateShopItem,
} from "./managers/shopService";
import { formatBalance, formatItem, getItem, getTypeNameForList } from "./util";

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

/**
 * Format stock info for display
 */
const formatStockInfo = (shopItem: ShopItemWithDetails): string => {
  const remaining = getRemainingStock(shopItem);
  if (remaining === null) return "";
  if (remaining === 0) return " Wyprzedane";
  return ` (${remaining}/${shopItem.globalStock})`;
};

/**
 * Format limits info for admin commands
 */
const formatLimitsInfo = (
  globalStock: number | null | undefined,
  userLimit: number | null | undefined,
): string => {
  const parts: string[] = [];
  if (globalStock != null) {
    parts.push(`limit globalny: ${globalStock}`);
  }
  if (userLimit != null) {
    parts.push(`limit na użytkownika: ${userLimit}`);
  }
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
};

/**
 * Format changes made to a shop item
 */
const formatChanges = (changes: ShopItemChanges, currencySymbol: string): string => {
  const parts: string[] = [];

  if (changes.price !== undefined) {
    parts.push(`cena: ${formatBalance(changes.price, currencySymbol)}`);
  }
  if (changes.globalStock !== undefined) {
    parts.push(
      changes.globalStock === null
        ? "limit globalny: usunięto"
        : `limit globalny: ${changes.globalStock}`,
    );
  }
  if (changes.userPurchaseLimit !== undefined) {
    parts.push(
      changes.userPurchaseLimit === null
        ? "limit na użytkownika: usunięto"
        : `limit na użytkownika: ${changes.userPurchaseLimit}`,
    );
  }

  return parts.join(", ");
};

function ShopItemComponent({ shopItem }: { shopItem: ShopItemWithDetails }) {
  const { id, price, item, currency } = shopItem;

  const stockInfo = formatStockInfo(shopItem);
  const formattedPrice = `${formatAmount(price)}${currency.symbol}`;

  return (
    <Section
      accessory={
        <Button
          label={formattedPrice}
          style={ButtonStyle.Success}
          customId={`shop-buy-${id}`}
        />
      }
    >
      <TextDisplay>
        <H3>
          {item.name}
          {stockInfo}
        </H3>
      </TextDisplay>
      {item.description && <TextDisplay>{item.description}</TextDisplay>}
    </Section>
  );
}

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

            const paginatedView = new PaginatedView(paginator, "Sklep", (shopItem) => (
              <ShopItemComponent shopItem={shopItem} />
            ));
            // TODO)) Handle shop button clicks
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
              } else if (error instanceof InvalidAmountError) {
                await errorFollowUp(itx, "Nieprawidłowa ilość");
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
          .addInteger("global-stock", (stock) =>
            stock
              .setDescription("Globalny limit sztuk (puste = bez limitu)")
              .setRequired(false)
              .setMinValue(1),
          )
          .addInteger("user-limit", (limit) =>
            limit
              .setDescription("Limit sztuk na użytkownika (puste = bez limitu)")
              .setRequired(false)
              .setMinValue(1),
          )
          .handle(
            async (
              { prisma },
              {
                id,
                price,
                "global-stock": globalStock,
                "user-limit": userPurchaseLimit,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const item = await getItem(prisma, id, itx.guildId);
              if (!item) {
                await errorFollowUp(itx, "Nie znaleziono przedmiotu o podanym ID");
                return;
              }

              await ensureUserExists(prisma, itx.user);
              const shopItem = await createShopItem({
                prisma,
                itemId: id,
                guildId: itx.guildId,
                currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                price,
                createdBy: itx.user.id,
                globalStock,
                userPurchaseLimit,
              });

              const limitsInfo = formatLimitsInfo(globalStock, userPurchaseLimit);
              await itx.editReply(
                `Wystawiono ${formatItem(item)} za ${formatBalance(price, shopItem.currency.symbol)}${limitsInfo}`,
              );
            },
          ),
      )
      .addCommand("usuń", (command) =>
        command
          .setDescription("Usuń przedmiot ze sklepu")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            try {
              const shopItem = await deleteShopItem({
                prisma,
                shopItemId: id,
                guildId: itx.guildId,
              });
              await itx.editReply(`Usunięto ${formatItem(shopItem.item)} ze sklepu`);
            } catch (error) {
              if (error instanceof ShopItemNotFoundError) {
                await errorFollowUp(
                  itx,
                  "Nie znaleziono przedmiotu w sklepie o podanym ID",
                );
              } else {
                throw error;
              }
            }
          }),
      )
      .addCommand("edytuj", (command) =>
        command
          .setDescription("Zmień cenę i/lub limity przedmiotu w sklepie")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .addInteger("price", (price) =>
            price.setDescription("Nowa cena przedmiotu").setRequired(false),
          )
          .addInteger("global-stock", (stock) =>
            stock
              .setDescription("Nowy limit globalny (0 = usuń limit)")
              .setRequired(false)
              .setMinValue(0),
          )
          .addInteger("user-limit", (limit) =>
            limit
              .setDescription("Nowy limit na użytkownika (0 = usuń limit)")
              .setRequired(false)
              .setMinValue(0),
          )
          .handle(
            async (
              { prisma },
              {
                id,
                price,
                "global-stock": globalStock,
                "user-limit": userPurchaseLimit,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              // Check if at least one field is being updated
              if (
                price === null &&
                globalStock === null &&
                userPurchaseLimit === null
              ) {
                await errorFollowUp(itx, "Nie podano żadnych zmian do wprowadzenia");
                return;
              }

              try {
                const { shopItem, changes } = await updateShopItem({
                  prisma,
                  shopItemId: id,
                  guildId: itx.guildId,
                  price,
                  globalStock,
                  userPurchaseLimit,
                });

                await itx.editReply(
                  `Zaktualizowano ${formatItem(shopItem.item)}: ${formatChanges(changes, shopItem.currency.symbol)}`,
                );
              } catch (error) {
                if (error instanceof ShopItemNotFoundError) {
                  await errorFollowUp(
                    itx,
                    "Nie znaleziono przedmiotu w sklepie o podanym ID",
                  );
                } else if (error instanceof InvalidStockError) {
                  await errorFollowUp(
                    itx,
                    `Nie można ustawić globalnego limitu na ${error.requestedStock}, gdy sprzedano już ${error.soldCount} sztuk`,
                  );
                } else {
                  throw error;
                }
              }
            },
          ),
      )
      .addCommand("info", (command) =>
        command
          .setDescription("Pokaż szczegóły przedmiotu w sklepie")
          .addInteger("id", (id) => id.setDescription("ID przedmiotu w sklepie"))
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const shopItem = await getShopItemWithDetails({
              prisma,
              shopItemId: id,
              guildId: itx.guildId,
            });

            if (!shopItem) {
              await errorFollowUp(
                itx,
                "Nie znaleziono przedmiotu w sklepie o podanym ID",
              );
              return;
            }

            const lines = [
              heading(`${shopItem.item.name} [${shopItem.id}]`, HeadingLevel.Three),
              `**Cena:** ${formatBalance(shopItem.price, shopItem.currency.symbol)}`,
              `**Sprzedano:** ${shopItem.soldCount}`,
            ];

            if (shopItem.globalStock !== null) {
              const remaining = shopItem.globalStock - shopItem.soldCount;
              lines.push(`**Limit globalny:** ${remaining}/${shopItem.globalStock}`);
            } else {
              lines.push("**Limit globalny:** brak");
            }

            if (shopItem.userPurchaseLimit !== null) {
              lines.push(`**Limit na użytkownika:** ${shopItem.userPurchaseLimit}`);
            } else {
              lines.push("**Limit na użytkownika:** brak");
            }

            if (shopItem.item.description) {
              lines.push(`**Opis:** ${shopItem.item.description}`);
            }

            await itx.editReply(lines.join("\n"));
          }),
      ),
  );
