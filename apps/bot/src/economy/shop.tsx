import { Hashira, PaginatedView, waitForConfirmation } from "@hashira/core";
import { DatabasePaginator, type ExtendedPrismaClient } from "@hashira/db";
import { Button, H3, Section, TextDisplay } from "@hashira/jsx";
import {
  type AutocompleteInteraction,
  type ButtonInteraction,
  ButtonStyle,
  bold,
  type ChatInputCommandInteraction,
  type Guild,
  HeadingLevel,
  heading,
  type Message,
  PermissionFlagsBits,
  subtext,
  type User,
  userMention,
} from "discord.js";
import { base } from "../base";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import {
  InsufficientBalanceError,
  InvalidAmountError,
  InvalidStockError,
  OutOfStockError,
  ShopItemNotFoundError,
  UserInventoryLimitExceededError,
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
import {
  formatBalance,
  formatItem,
  getGuildDefaultCurrencySymbol,
  getItem,
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

/**
 * Format stock info for display
 */
const formatStockInfo = (shopItem: ShopItemWithDetails): string | null => {
  const stock = getRemainingStock(shopItem);
  if (stock === null) return null;
  if (stock === 0) return "Wyprzedane";
  return `Dostępne: (${stock}/${shopItem.globalStock})`;
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

function ShopItemComponent({
  shopItem,
  showId = false,
  active = true,
}: {
  shopItem: ShopItemWithDetails;
  showId?: boolean;
  active?: boolean;
}) {
  const { id, price, item, currency } = shopItem;

  const formattedPrice = `${formatAmount(price)}${currency.symbol}`;
  const stock = getRemainingStock(shopItem);
  const formattedStock = formatStockInfo(shopItem);

  return (
    <Section
      accessory={
        <Button
          label={formattedPrice}
          style={ButtonStyle.Success}
          customId={`shop-buy:${id}`}
          disabled={!active || stock === 0}
        />
      }
    >
      <TextDisplay>
        <H3>
          {item.name}
          {showId && <> [{id}]</>}
        </H3>
        {item.description && `\n${item.description}`}
        {formattedStock && `\n${subtext(formattedStock)}`}
      </TextDisplay>
    </Section>
  );
}

async function universalPurchaseShopItem({
  prisma,
  shopItemId,
  user,
  guild,
  quantity,
  reply,
}: {
  prisma: ExtendedPrismaClient;
  shopItemId: number;
  user: User;
  guild: Guild;
  quantity: number;
  reply: (content: string) => Promise<unknown>;
}) {
  await ensureUserExists(prisma, user.id);

  try {
    const result = await purchaseShopItem({
      prisma,
      shopItemId,
      userId: user.id,
      guildId: guild.id,
      quantity,
    });

    const { shopItem, totalPrice } = result;
    const quantityText = quantity > 1 ? ` x${quantity}` : "";
    await reply(
      `Kupiono **${shopItem.item.name}**${quantityText} za ${formatBalance(totalPrice, shopItem.currency.symbol)}`,
    );
  } catch (error) {
    if (error instanceof ShopItemNotFoundError) {
      await reply("Nie znaleziono przedmiotu w sklepie");
    } else if (error instanceof UserInventoryLimitExceededError) {
      await reply(
        `Przekroczono limit ilości tego przedmiotu w Twoim ekwipunku (${error.currentQuantity}/${error.limit})`,
      );
    } else if (error instanceof UserPurchaseLimitExceededError) {
      await reply(
        `Osiągnięto limit zakupów tego przedmiotu (${error.currentQuantity}/${error.limit})`,
      );
    } else if (error instanceof OutOfStockError) {
      await reply("Przedmiot jest wyprzedany");
    } else if (error instanceof InsufficientBalanceError) {
      await reply("Nie masz wystarczająco środków");
    } else if (error instanceof InvalidAmountError) {
      await reply("Nieprawidłowa ilość");
    } else {
      throw error;
    }
  }
}

/**
 * Handle clicks of the "purchase" button on individual shop items
 */
async function handleShopPurchaseButtonClick({
  prisma,
  itx,
  button,
}: {
  prisma: ExtendedPrismaClient;
  itx: ChatInputCommandInteraction<"cached">;
  button: ButtonInteraction;
}) {
  if (!button.customId.startsWith("shop-buy:")) return;
  const rawId = button.customId.split(":")[1];
  if (!rawId) return;
  const shopItemId = parseInt(rawId, 10);
  const shopItem = await getShopItemWithDetails({
    prisma,
    shopItemId,
    guildId: itx.guildId,
  });
  if (!shopItem) return;
  const { item, price, currency } = shopItem;

  // FIXME: We don't have a way to get the confirmation dialog message and rely
  // on it being a direct reply to an interaction, so this weird setup is needed
  // in order to edit the actual confirmation message after accepting or rejecting
  let confirmationDialogMessage: Message | undefined;
  const confirmation = await waitForConfirmation(
    {
      send: async (args) => {
        // Send as a follow up to the shop paginated view
        confirmationDialogMessage = await itx.followUp.bind(itx)(args);
        return confirmationDialogMessage;
      },
    },
    `Czy na pewno chcesz kupić ${bold(item.name)} za ${formatBalance(price, currency.symbol)}? ${userMention(itx.user.id)}`,
    "Tak",
    "Nie",
    (action) => action.user.id === itx.user.id,
  );

  if (!confirmation) {
    await confirmationDialogMessage?.edit({
      content: `Anulowano zakup ${bold(shopItem.item.name)}`,
      components: [],
    });
    return;
  }

  await universalPurchaseShopItem({
    prisma,
    shopItemId,
    user: itx.user,
    guild: itx.guild,
    quantity: 1,
    reply: async (content) =>
      confirmationDialogMessage?.edit({
        content,
        components: [],
      }),
  });
}

/**
 * Resolve the currency used by a shop command: an explicit override, or the
 * guild's configured default currency (null when none is configured).
 */
const getEffectiveCurrencySymbol = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  override?: string | null,
): Promise<string | null> =>
  override ? override : getGuildDefaultCurrencySymbol(prisma, guildId);

async function autocompleteCurrencies({
  prisma,
  itx,
}: {
  prisma: ExtendedPrismaClient;
  itx: AutocompleteInteraction<"cached">;
}) {
  const focused = itx.options.getFocused().toLowerCase();

  const currencies = await prisma.currency.findMany({
    where: {
      guildId: itx.guildId,
      OR: [
        { name: { contains: focused, mode: "insensitive" } },
        { symbol: { contains: focused, mode: "insensitive" } },
      ],
    },
    take: 25,
  });

  await itx.respond(
    currencies.map((currency) => ({
      name: `${currency.name} (${currency.symbol})`,
      value: currency.symbol,
    })),
  );
}

async function autocompleteShopItems({
  prisma,
  itx,
  currencySymbol,
}: {
  prisma: ExtendedPrismaClient;
  itx: AutocompleteInteraction<"cached">;
  currencySymbol?: string | null;
}) {
  const shopItems = await prisma.shopItem.findMany({
    where: {
      deletedAt: null,
      item: {
        guildId: itx.guildId,
        name: {
          contains: itx.options.getFocused(),
          mode: "insensitive",
        },
      },
      ...(currencySymbol ? { currency: { symbol: currencySymbol } } : {}),
    },
    include: { item: true, currency: true },
    take: 25,
  });
  await itx.respond(
    shopItems.map(({ id, price, item, currency }) => ({
      value: id,
      name: `${item.name} - ${formatAmount(price)} ${currency.symbol} ${getTypeNameForList(item.type)}`,
    })),
  );
}

/**
 * Shared autocomplete handler for shop commands with a currency selector and an
 * item selector.
 */
async function handleShopAutocomplete({
  prisma,
  itx,
}: {
  prisma: ExtendedPrismaClient;
  itx: AutocompleteInteraction<"cached">;
}) {
  if (itx.options.getFocused(true).name === "waluta") {
    await autocompleteCurrencies({ prisma, itx });
    return;
  }

  const currencySymbol = await getEffectiveCurrencySymbol(
    prisma,
    itx.guildId,
    itx.options.getString("waluta"),
  );

  if (!currencySymbol) {
    await itx.respond([]);
    return;
  }

  await autocompleteShopItems({ prisma, itx, currencySymbol });
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
          .addBoolean("id", (id) =>
            id.setDescription("Wyświetl ID przedmiotów").setRequired(false),
          )
          .addString("waluta", (waluta) =>
            waluta
              .setDescription("Waluta, w której chcesz zobaczyć sklep")
              .setRequired(false)
              .setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await handleShopAutocomplete({ prisma, itx });
          })
          .handle(async ({ prisma }, { id: maybeShowId, waluta }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const showId = maybeShowId ?? false;
            const currencySymbol = await getEffectiveCurrencySymbol(
              prisma,
              itx.guildId,
              waluta,
            );

            if (!currencySymbol) {
              await errorFollowUp(
                itx,
                "Nie ustawiono domyślnej waluty serwera. Użyj /settings default-currency",
              );
              return;
            }

            const paginator = new DatabasePaginator(
              (props, price) =>
                prisma.shopItem.findMany({
                  ...props,
                  where: {
                    deletedAt: null,
                    item: { guildId: itx.guildId },
                    currency: { symbol: currencySymbol },
                  },
                  orderBy: { price },
                  include: { item: true, currency: true },
                }),
              () =>
                prisma.shopItem.count({
                  where: {
                    deletedAt: null,
                    item: { guildId: itx.guildId },
                    currency: { symbol: currencySymbol },
                  },
                }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Sklep",
              (shopItem, _idx, active) => (
                <ShopItemComponent
                  shopItem={shopItem}
                  showId={showId}
                  active={active}
                />
              ),
              false,
              null,
              // FIXME: The inner button handler has a blocking confirmation
              // dialog, which prevents the user from interacting with the shop
              // paginated view while a confirmation is active
              async (button) => handleShopPurchaseButtonClick({ prisma, itx, button }),
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
          .addString("waluta", (waluta) =>
            waluta
              .setDescription("Waluta, w której kupujesz")
              .setRequired(false)
              .setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await handleShopAutocomplete({ prisma, itx });
          })
          .handle(async ({ prisma }, { przedmiot: id, ilość: rawAmount }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await universalPurchaseShopItem({
              prisma,
              shopItemId: id,
              user: itx.user,
              guild: itx.guild,
              quantity: rawAmount ?? 1,
              reply: (content) => itx.followUp(content),
            });
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
          .addInteger("price", (price) =>
            price.setDescription("Cena przedmiotu").setMinValue(0),
          )
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
          .addString("currency", (currency) =>
            currency
              .setDescription("Waluta ceny (domyślnie waluta serwera)")
              .setRequired(false)
              .setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await handleShopAutocomplete({ prisma, itx });
          })
          .handle(
            async (
              { prisma },
              {
                id,
                price,
                "global-stock": globalStock,
                "user-limit": userPurchaseLimit,
                currency,
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

              const currencySymbol = await getEffectiveCurrencySymbol(
                prisma,
                itx.guildId,
                currency,
              );

              if (!currencySymbol) {
                await errorFollowUp(
                  itx,
                  "Nie ustawiono domyślnej waluty serwera. Użyj /settings default-currency",
                );
                return;
              }

              const shopItem = await createShopItem({
                prisma,
                itemId: id,
                guildId: itx.guildId,
                currencySymbol,
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
          .addInteger("przedmiot", (przedmiot) =>
            przedmiot.setDescription("Przedmiotu ze sklepu").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await autocompleteShopItems({ prisma, itx });
          })
          .handle(async ({ prisma }, { przedmiot: id }, itx) => {
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
          .addInteger("przedmiot", (przedmiot) =>
            przedmiot.setDescription("Przedmiotu ze sklepu").setAutocomplete(true),
          )
          .addInteger("price", (price) =>
            price
              .setDescription("Nowa cena przedmiotu")
              .setRequired(false)
              .setMinValue(0),
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
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await autocompleteShopItems({ prisma, itx });
          })
          .handle(
            async (
              { prisma },
              {
                przedmiot: id,
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
          .addInteger("przedmiot", (przedmiot) =>
            przedmiot.setDescription("Przedmiotu ze sklepu").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await autocompleteShopItems({ prisma, itx });
          })
          .handle(async ({ prisma }, { przedmiot: id }, itx) => {
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
