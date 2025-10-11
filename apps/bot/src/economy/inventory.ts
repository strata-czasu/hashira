import {
  ConfirmationDialog,
  type ExtractContext,
  Hashira,
  PaginatedView,
} from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import {
  type AutocompleteInteraction,
  PermissionFlagsBits,
  TimestampStyles,
  bold,
  inlineCode,
  time,
} from "discord.js";
import { base } from "../base";
import { parseDate } from "../util/dateParsing";
import { ensureUserExists, ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { getInventoryItem, getItem, getTypeNameForList } from "./util";

const autocompleteItem = async ({
  prisma,
  itx,
}: {
  prisma: ExtractContext<typeof base>["prisma"];
  itx: AutocompleteInteraction<"cached">;
}) => {
  const results = await prisma.item.findMany({
    where: {
      deletedAt: null,
      guildId: itx.guildId,
      name: {
        contains: itx.options.getFocused(),
        mode: "insensitive",
      },
    },
  });
  return itx.respond(
    results.map(({ id, name, type }) => ({
      value: id,
      name: `${name} ${getTypeNameForList(type)}`,
    })),
  );
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
          .addUser("user", (user) =>
            user.setDescription("Użytkownik").setRequired(false),
          )
          .handle(async ({ prisma }, { user: rawUser }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const user = rawUser ?? itx.user;

            const items = await prisma.item.findMany({
              where: { guildId: itx.guildId },
              select: { id: true, name: true },
            });
            const itemNames = new Map(items.map((item) => [item.id, item.name]));

            const where: Prisma.InventoryItemWhereInput = {
              item: { guildId: itx.guildId },
              userId: user.id,
              deletedAt: null,
              expiresAt: { gte: itx.createdAt },
            };
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
                const itemName = itemNames.get(itemId) ?? "Nieznany przedmiot";
                if (_count === 1) return `- ${itemName} ${idString}`;
                // TODO)) Display item expiration date
                // TODO)) Separate items with and without expiry
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
          .handle(
            async (
              { prisma, lock, economyLog },
              { id: itemId, user: targetUser },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              if (targetUser.id === itx.user.id) {
                return await errorFollowUp(
                  itx,
                  "Nie możesz przekazać przedmiotu samemu sobie!",
                );
              }

              const item = await prisma.item.findFirst({
                where: {
                  id: itemId,
                  deletedAt: null,
                  guildId: itx.guildId,
                  type: "item",
                },
              });
              if (!item) {
                return await errorFollowUp(
                  itx,
                  "Przedmiot o podanym ID nie istnieje lub nie możesz go przekazać!",
                );
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
                    // TODO)) Don't let users transfer expired items
                    // TODO)) Let the user select which inventory item to transfer
                    //        e.g. user has 2 of the same item, but one has an expiry date
                    const inventoryItem = await getInventoryItem(
                      tx,
                      itemId,
                      itx.guildId,
                      itx.user.id,
                    );
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
                  economyLog.push("itemTransfer", itx.guild, {
                    fromUser: itx.user,
                    toUser: targetUser,
                    item,
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
                [`inventory_item_transfer_${itx.guildId}_${itx.user.id}_${itemId}`],
                async () => dialog.render({ send: itx.editReply.bind(itx) }),
                () =>
                  errorFollowUp(
                    itx,
                    "Jesteś już w trakcie przekazania tego przedmiotu!",
                  ),
              );
            },
          ),
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
          .addInteger("przedmiot", (id) =>
            id.setDescription("Przedmiot").setAutocomplete(true),
          )
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("data-waznosci", (expiry) =>
            expiry
              .setDescription("Data ważności przedmiotu (np. 2025-07-01)")
              .setRequired(false),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteItem({ prisma, itx });
          })
          .handle(
            async (
              { prisma, economyLog },
              { przedmiot: itemId, user, "data-waznosci": rawExpiresAt },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              let expiresAt: Date | null = null;
              if (rawExpiresAt) {
                // TODO)) Parse date in our TZ
                // TODO)) Should the item expire at the start or end of the selected day?
                expiresAt = parseDate(rawExpiresAt, "start", null);
                if (!expiresAt) {
                  return await errorFollowUp(
                    itx,
                    "Nieprawidłowa data ważności przedmiotu. Podaj datę w formacie RRRR-MM-DD",
                  );
                }
              }

              await ensureUserExists(prisma, user);
              const item = await prisma.$transaction(async (tx) => {
                const item = await getItem(tx, itemId, itx.guildId);
                if (!item) {
                  await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
                  return null;
                }

                await tx.inventoryItem.create({
                  data: {
                    itemId,
                    userId: user.id,
                    expiresAt,
                  },
                });
                return item;
              });
              if (!item) return;

              economyLog.push("itemAddToInventory", itx.guild, {
                moderator: itx.user,
                user,
                item,
              });
              const responseParts = [
                `Dodano ${bold(item.name)} ${getTypeNameForList(item.type)} do ekwipunku ${bold(user.tag)}`,
              ];
              if (expiresAt) {
                responseParts.push(
                  `(wygasa ${time(expiresAt, TimestampStyles.ShortDateTime)})`,
                );
              }
              await itx.editReply(responseParts.join(" "));
            },
          ),
      )
      .addCommand("zabierz", (command) =>
        command
          .setDescription("Zabierz przedmiot z ekwipunku użytkownika")
          .addInteger("przedmiot", (id) =>
            id.setDescription("Przedmiot").setAutocomplete(true),
          )
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteItem({ prisma, itx });
          })
          .handle(async ({ prisma, economyLog }, { przedmiot: itemId, user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await prisma.$transaction(async (tx) => {
              const item = await getItem(prisma, itemId, itx.guildId);
              if (!item) {
                return await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
              }

              const inventoryItem = await getInventoryItem(
                tx,
                itemId,
                itx.guildId,
                user.id,
              );
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

            economyLog.push("itemRemoveFromInventory", itx.guild, {
              moderator: itx.user,
              user,
              item,
            });
            await itx.editReply(
              `Usunięto ${bold(item.name)} z ekwipunku ${bold(user.tag)}.`,
            );
          }),
      ),
  );
