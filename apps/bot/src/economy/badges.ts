import { italic, userMention } from "discord.js";
import { keyBy } from "es-toolkit";

import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, Prisma } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";

import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";

export const badges = new Hashira({ name: "badges" }).use(base).group("osiągnięcia", (group) =>
  group
    .setDescription("Osiągnięcia")
    .setDMPermission(false)
    .addCommand("lista", (command) =>
      command.setDescription("Wyświetl listę osiągnięć").handle(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const itemsWhere: Prisma.ItemWhereInput = {
          type: "badge",
          guildId: itx.guildId,
          deletedAt: null,
        };

        const items = await prisma.item.findMany({
          where: itemsWhere,
          include: { badge: true },
        });
        const itemsById = keyBy(items, (item) => item.id);

        const paginator = new DatabasePaginator(
          (props, ordering) => {
            const sqlOrdering = Prisma.sql([ordering]);
            return prisma.$queryRaw<{ itemId: number; total: number }[]>`
                select
                  "item"."id" as "itemId",
                  count("inventoryItem"."itemId") as "total"
                from "item"
                left join "inventoryItem" on ("inventoryItem"."itemId" = "item"."id")
                where
                  "item"."guildId" = ${itx.guild.id}
                  and "item"."deletedAt" is null
                  and "item"."type" = 'badge'
                group by "item"."id"
                order by
                  count("inventoryItem"."itemId") ${sqlOrdering},
                  "item"."id" ${sqlOrdering}
                offset ${props.skip}
                limit ${props.take};
              `;
          },
          () =>
            prisma.item.count({
              where: itemsWhere,
            }),
          { defaultOrder: PaginatorOrder.DESC },
        );

        const paginatedView = new PaginatedView(
          paginator,
          "Osiągnięcia",
          ({ itemId, total }) => {
            const item = itemsById[itemId];
            const name = item?.name ?? "Nieznane osiągnięcie";
            const parts: string[] = [name];
            if (item?.badge && item.badge.stars > 0) parts.push("★".repeat(item.badge.stars));
            parts.push(`[${total} :busts_in_silhouette:]`);
            if (item?.description) parts.push(`\n${italic(item.description)}`);
            return parts.join(" ");
          },
          true,
        );
        await paginatedView.render(itx);
      }),
    )
    .addCommand("kto-posiada", (command) =>
      command
        .setDescription("Sprawdź, kto posiada osiągnięcie")
        .addInteger("osiągnięcie", (id) => id.setDescription("Osiągnięcie").setAutocomplete(true))
        .autocomplete(async ({ prisma }, _, itx) => {
          if (!itx.inCachedGuild()) return;
          const results = await prisma.item.findMany({
            where: {
              deletedAt: null,
              guildId: itx.guildId,
              type: "badge",
              name: {
                contains: itx.options.getFocused(),
                mode: "insensitive",
              },
            },
            take: 25,
          });
          await itx.respond(results.map(({ id, name }) => ({ value: id, name })));
        })
        .handle(async ({ prisma }, { osiągnięcie: itemId }, itx) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          const item = await prisma.item.findFirst({
            where: {
              id: itemId,
              deletedAt: null,
              guildId: itx.guildId,
              type: "badge",
            },
          });
          if (!item) {
            return await errorFollowUp(itx, "Osiągnięcie o tym ID nie istnieje");
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
                orderBy: { userId: ordering },
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
            `Użytkownicy posiadający osiągnięcie ${item.name}`,
            ({ userId }, idx) => `${idx}. ${userMention(userId)}`,
            true,
          );
          await paginatedView.render(itx);
        }),
    ),
);
