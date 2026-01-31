import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type Prisma } from "@hashira/db";
import { userMention } from "discord.js";
import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";

export const badges = new Hashira({ name: "badges" })
  .use(base)
  .group("odznaki", (group) =>
    group
      .setDescription("Odznaki")
      .setDMPermission(false)
      .addCommand("kto-posiada", (command) =>
        command
          .setDescription("Sprawdź, kto posiada odznakę")
          .addInteger("odznaka", (id) =>
            id.setDescription("Odznaka").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            const results = await prisma.item.findMany({
              where: {
                deletedAt: null,
                guildId: itx.guildId,
                type: "badge",
              },
            });
            await itx.respond(results.map(({ id, name }) => ({ value: id, name })));
          })
          .handle(async ({ prisma }, { odznaka: itemId }, itx) => {
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
              return await errorFollowUp(itx, "Odznaka o tym ID nie istnieje");
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
              `Użytkownicy posiadający odznakę ${item.name}`,
              ({ userId }, idx) => `${idx}. ${userMention(userId)}`,
              true,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
