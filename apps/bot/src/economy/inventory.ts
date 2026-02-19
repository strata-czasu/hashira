import {
  ConfirmationDialog,
  type ExtractContext,
  Hashira,
  PaginatedView,
} from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import {
  type AutocompleteInteraction,
  bold,
  inlineCode,
  PermissionFlagsBits,
} from "discord.js";
import { base } from "../base";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { fetchMembers } from "../util/fetchMembers";
import { parseUserMentions } from "../util/parseUsers";
import { pluralizers } from "../util/pluralize";
import {
  getInventoryItem,
  getInventoryItems,
  getItem,
  getTypeNameForList,
} from "./util";

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
    take: 25,
  });

  return itx.respond(
    results.map(({ id, name, type }) => ({
      value: id,
      name: `${name} ${getTypeNameForList(type)} [${id}]`,
    })),
  );
};

const autocompleteUserInventoryItem = async ({
  prisma,
  itx,
  userId,
}: {
  prisma: ExtractContext<typeof base>["prisma"];
  itx: AutocompleteInteraction<"cached">;
  userId: string | undefined;
}) => {
  const focusedValue = itx.options.getFocused();

  const results = await prisma.item.findMany({
    where: {
      deletedAt: null,
      guildId: itx.guildId,
      name: {
        contains: focusedValue,
        mode: "insensitive",
      },
      ...(userId
        ? {
            inventoryItem: {
              some: {
                userId,
                deletedAt: null,
              },
            },
          }
        : {}),
    },
    take: 25,
  });

  return itx.respond(
    results.map(({ id, name, type }) => ({
      value: id,
      name: `${name} ${getTypeNameForList(type)} [${id}]`,
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
              select: { id: true, name: true, type: true },
            });
            const itemNames = new Map(items.map((item) => [item.id, item.name]));
            const itemTypes = new Map(items.map((item) => [item.id, item.type]));

            const where: Prisma.InventoryItemWhereInput = {
              item: { guildId: itx.guildId },
              userId: user.id,
              deletedAt: null,
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
                const itemName = itemNames.get(itemId) ?? "Nieznany przedmiot";
                const itemType = itemTypes.get(itemId) ?? "item";
                const parts = [`-`, getTypeNameForList(itemType), itemName];
                if (_count !== 1) parts.push(`(x${bold(_count.toString())})`);
                parts.push(`[${inlineCode(itemId.toString())}]`);
                return parts.join(" ");
              },
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription("Przekaż przedmiot innemu użytkownikowi")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addInteger("id", (id) =>
            id.setDescription("ID przedmiotu").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteUserInventoryItem({ prisma, itx, userId: itx.user.id });
          })
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
          .addString("users", (user) =>
            user.setDescription(
              "Użytkownicy którym chcesz dodać przedmiot (oddzielone spacjami)",
            ),
          )
          .addInteger("przedmiot", (id) =>
            id.setDescription("Przedmiot").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteItem({ prisma, itx });
          })
          .handle(
            async (
              { prisma, economyLog },
              { przedmiot: itemId, users: rawUsers },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const members = await fetchMembers(
                itx.guild,
                parseUserMentions(rawUsers),
              );
              const users = members.map((m) => m.user);

              await ensureUsersExist(prisma, users);
              const item = await prisma.$transaction(async (tx) => {
                const item = await getItem(tx, itemId, itx.guildId);
                if (!item) {
                  await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
                  return null;
                }

                await tx.inventoryItem.createMany({
                  data: users.map((user) => ({
                    itemId,
                    userId: user.id,
                  })),
                });
                return item;
              });

              if (!item) return;

              economyLog.push("itemAddToInventory", itx.guild, {
                moderator: itx.user,
                users,
                item,
                quantity: 1,
              });

              const formattedUsers =
                users.length === 1
                  ? // biome-ignore lint/style/noNonNullAssertion: The size is checked to be 1
                    bold(users.at(0)!.tag)
                  : `${bold(users.length.toString())} ${pluralizers.dativeUsers(users.length)}`;
              await itx.editReply(
                `Dodano ${bold(item.name)} ${getTypeNameForList(item.type)} do ekwipunku ${formattedUsers}`,
              );
            },
          ),
      )
      .addCommand("zabierz", (command) =>
        command
          .setDescription("Zabierz przedmiot z ekwipunku użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addInteger("przedmiot", (id) =>
            id.setDescription("Przedmiot").setAutocomplete(true),
          )
          .addInteger("ilość", (amount) =>
            amount
              .setDescription("Ilość przedmiotów do zabrania")
              .setRequired(false)
              .setMinValue(1),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            const userId = itx.options.get("user")?.value as string | undefined;

            return autocompleteUserInventoryItem({ prisma, itx, userId });
          })
          .handle(
            async (
              { prisma, economyLog },
              { przedmiot: itemId, ilość: amount, user },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const qty = amount ?? 1;

              const result = await prisma.$transaction(async (tx) => {
                const item = await getItem(tx, itemId, itx.guildId);
                if (!item) {
                  return { ok: false, reason: "not_found" } as const;
                }

                const owned = await getInventoryItems(tx, itx.guildId, user.id, [
                  itemId,
                ]);

                if (owned.length === 0) {
                  return { ok: false, reason: "no_items", item } as const;
                }
                if (owned.length < qty) {
                  return {
                    ok: false,
                    reason: "insufficient",
                    item,
                    ownedCount: owned.length,
                  } as const;
                }

                const sorted = owned.sort((a, b) => {
                  const timeCompare = a.createdAt.getTime() - b.createdAt.getTime();
                  if (timeCompare !== 0) return timeCompare;
                  return a.id - b.id;
                });
                const toDelete = sorted.slice(0, qty).map((i) => i.id);

                const { count } = await tx.inventoryItem.updateMany({
                  where: { id: { in: toDelete }, deletedAt: null },
                  data: { deletedAt: itx.createdAt },
                });

                if (count !== qty) {
                  throw new Error("Concurrency conflict: some items were modified");
                }

                return { ok: true, item, deletedCount: count } as const;
              });

              if (!result.ok) {
                switch (result.reason) {
                  case "not_found":
                    return await errorFollowUp(
                      itx,
                      "Przedmiot o podanym ID nie istnieje",
                    );
                  case "no_items":
                    return await errorFollowUp(
                      itx,
                      `${bold(user.tag)} nie posiada ${bold(result.item.name)}`,
                    );
                  case "insufficient":
                    return await errorFollowUp(
                      itx,
                      `${bold(user.tag)} posiada tylko ${bold(result.ownedCount.toString())} sztuk ${bold(result.item.name)}, a próbujesz zabrać ${bold(qty.toString())}`,
                    );
                }
              }

              economyLog.push("itemRemoveFromInventory", itx.guild, {
                moderator: itx.user,
                users: [user],
                item: result.item,
                quantity: qty,
              });

              const countText =
                result.deletedCount === 1
                  ? ""
                  : ` (x${bold(result.deletedCount.toString())})`;
              await itx.editReply(
                `Usunięto ${bold(result.item.name)}${countText} z ekwipunku ${bold(user.tag)}.`,
              );
            },
          ),
      )
      .addCommand("posiadacze", (command) =>
        command
          .setDescription("Znajdź wszystkich użytkowników posiadających dany przedmiot")
          .addInteger("przedmiot", (id) =>
            id.setDescription("Przedmiot").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteItem({ prisma, itx });
          })
          .handle(async ({ prisma }, { przedmiot: itemId }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const item = await getItem(prisma, itemId, itx.guildId);
            if (!item) {
              return await errorFollowUp(itx, "Przedmiot o podanym ID nie istnieje");
            }

            const where: Prisma.InventoryItemWhereInput = {
              itemId,
              item: { guildId: itx.guildId },
              deletedAt: null,
            };

            const paginator = new DatabasePaginator(
              (props, ordering) =>
                prisma.inventoryItem.groupBy({
                  by: "userId",
                  where,
                  _count: true,
                  orderBy: [{ _count: { userId: ordering } }, { userId: ordering }],
                  ...props,
                }),
              async () => {
                const count = await prisma.inventoryItem.groupBy({
                  by: "userId",
                  where,
                });
                return count.length;
              },
            );

            const paginatedView = new PaginatedView(
              paginator,
              `Posiadacze ${item.name} ${getTypeNameForList(item.type)}`,
              ({ _count, userId }, idx) => {
                if (_count === 1) return `${idx}. <@${userId}>`;
                return `${idx}. <@${userId}> (x${bold(_count.toString())})`;
              },
              true,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
