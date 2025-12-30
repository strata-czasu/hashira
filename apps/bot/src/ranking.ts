import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, Prisma } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import { endOfMonth } from "date-fns";
import { ChannelType, TimestampStyles, time } from "discord.js";
import { base } from "./base";
import { parseDate } from "./util/dateParsing";
import { errorFollowUp } from "./util/errorFollowUp";
import { pluralizers } from "./util/pluralize";

function formatTimeRange(start: Date, end: Date) {
  return `${time(start, TimestampStyles.ShortDate)} - ${time(end, TimestampStyles.ShortDate)}`;
}

export const ranking = new Hashira({ name: "ranking" })
  .use(base)
  .group("ranking", (group) =>
    group
      .setDescription("Komendy związane z rankingami")
      .addCommand("user", (command) =>
        command
          .setDescription("Ranking kanałów użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .addString("okres", (period) =>
            period.setDescription("Okres czasu, np. 2025-01"),
          )
          .handle(async ({ prisma }, { user, okres: rawPeriod }, itx) => {
            if (!itx.inCachedGuild()) return;

            const periodStart = parseDate(rawPeriod, "start", null);
            if (!periodStart) {
              return await errorFollowUp(itx, "Nieprawidłowy okres. Przykład: 2025-01");
            }
            const periodEnd = endOfMonth(periodStart);

            const where = {
              guildId: itx.guild.id,
              userId: user.id,
              timestamp: {
                gte: periodStart,
                lte: periodEnd,
              },
            };
            const paginate = new DatabasePaginator(
              (props, ordering) =>
                prisma.userTextActivity.groupBy({
                  ...props,
                  by: "channelId",
                  where,
                  _count: true,
                  orderBy: [
                    { _count: { channelId: ordering } },
                    { channelId: ordering },
                  ],
                }),
              async () => {
                const count = await prisma.userTextActivity.groupBy({
                  by: "channelId",
                  where,
                });
                return count.length;
              },
              { pageSize: 30, defaultOrder: PaginatorOrder.DESC },
            );

            const formatEntry = (
              item: { channelId: string; _count: number },
              idx: number,
            ) => {
              return (
                `${idx}\\.` +
                ` <#${item.channelId}> - ${item._count.toLocaleString("pl-PL")} ${pluralizers.messages(item._count)}`
              );
            };

            const paginator = new PaginatedView(
              paginate,
              `Ranking wiadomości ${user.tag}`,
              formatEntry,
              true,
              formatTimeRange(periodStart, periodEnd),
            );
            await paginator.render(itx);
          }),
      )
      .addCommand("kanał", (command) =>
        command
          .setDescription("Ranking użytkowników na kanale")
          .addChannel("kanał", (channel) =>
            channel.setDescription("Kanał").setChannelType(ChannelType.GuildText),
          )
          .addString("okres", (period) =>
            period.setDescription("Okres czasu, np. 2025-01"),
          )
          .handle(async ({ prisma }, { kanał: channel, okres: rawPeriod }, itx) => {
            if (!itx.inCachedGuild()) return;

            const periodStart = parseDate(rawPeriod, "start", null);
            if (!periodStart) {
              return await errorFollowUp(itx, "Nieprawidłowy okres. Przykład: 2025-01");
            }
            const periodEnd = endOfMonth(periodStart);

            const where = {
              guildId: itx.guild.id,
              channelId: channel.id,
              timestamp: {
                gte: periodStart,
                lte: periodEnd,
              },
            };
            const paginate = new DatabasePaginator(
              (props, ordering) =>
                prisma.userTextActivity.groupBy({
                  ...props,
                  by: "userId",
                  where,
                  _count: true,
                  orderBy: [{ _count: { userId: ordering } }, { userId: ordering }],
                }),
              async () => {
                const count = await prisma.userTextActivity.groupBy({
                  by: "userId",
                  where,
                });
                return count.length;
              },
              { pageSize: 30, defaultOrder: PaginatorOrder.DESC },
            );

            const formatEntry = (
              item: { userId: string; _count: number },
              idx: number,
            ) => {
              return (
                `${idx}\\.` +
                ` <@${item.userId}> - ${item._count.toLocaleString("pl-PL")} ${pluralizers.messages(item._count)}`
              );
            };

            const paginator = new PaginatedView(
              paginate,
              `Ranking wiadomości na kanale ${channel.name}`,
              formatEntry,
              true,
              formatTimeRange(periodStart, periodEnd),
            );
            await paginator.render(itx);
          }),
      )
      .addCommand("serwer", (command) =>
        command
          .setDescription("Ranking kanałów na serwerze")
          .addString("okres", (period) =>
            period.setDescription("Okres czasu, np. 2025-01"),
          )
          .handle(async ({ prisma }, { okres: rawPeriod }, itx) => {
            if (!itx.inCachedGuild()) return;

            const periodStart = parseDate(rawPeriod, "start", null);
            if (!periodStart) {
              return await errorFollowUp(itx, "Nieprawidłowy okres. Przykład: 2025-01");
            }
            const periodEnd = endOfMonth(periodStart);

            const where = {
              guildId: itx.guild.id,
              timestamp: {
                gte: periodStart,
                lte: periodEnd,
              },
            };
            const paginate = new DatabasePaginator(
              (props, ordering) => {
                const sqlOrdering = Prisma.sql([ordering]);
                return prisma.$queryRaw<
                  { channelId: string; total: number; uniqueMembers: number }[]
                >`
                  select
                    "channelId",
                    count(*) as "total",
                    count(distinct "userId") as "uniqueMembers"
                  from "userTextActivity"
                  where
                    "guildId" = ${itx.guild.id}
                    and "timestamp" between ${periodStart} and ${periodEnd}
                  group by "channelId"
                  order by "total" ${sqlOrdering}
                  offset ${props.skip}
                  limit ${props.take};
                `;
              },
              async () => {
                const count = await prisma.userTextActivity.groupBy({
                  by: "channelId",
                  where,
                });
                return count.length;
              },
              { pageSize: 30, defaultOrder: PaginatorOrder.DESC },
            );

            const formatEntry = (
              item: { channelId: string; total: number; uniqueMembers: number },
              idx: number,
            ) => {
              return (
                `${idx}\\.` +
                ` <#${item.channelId}> - ${item.total.toLocaleString("pl-PL")} ${pluralizers.messages(item.total)}` +
                ` [${item.uniqueMembers} :busts_in_silhouette:]`
              );
            };

            const paginator = new PaginatedView(
              paginate,
              "Ranking kanałów na serwerze",
              formatEntry,
              true,
              formatTimeRange(periodStart, periodEnd),
            );
            await paginator.render(itx);
          }),
      )
      .addCommand("serwer-użytkownicy", (command) =>
        command
          .setDescription("Ranking użytkowników na serwerze")
          .addString("okres", (period) =>
            period.setDescription("Okres czasu, np. 2025-01"),
          )
          .handle(async ({ prisma }, { okres: rawPeriod }, itx) => {
            if (!itx.inCachedGuild()) return;

            const periodStart = parseDate(rawPeriod, "start", null);
            if (!periodStart) {
              return await errorFollowUp(itx, "Nieprawidłowy okres. Przykład: 2025-01");
            }
            const periodEnd = endOfMonth(periodStart);

            const where = {
              guildId: itx.guild.id,
              timestamp: {
                gte: periodStart,
                lte: periodEnd,
              },
            };
            const paginate = new DatabasePaginator(
              (props, ordering) => {
                const sqlOrdering = Prisma.sql([ordering]);
                return prisma.$queryRaw<
                  { userId: string; total: number; uniqueChannels: number }[]
                >`
                  select
                    "userId",
                    count(*) as "total",
                    count(distinct "channelId") as "uniqueChannels"
                  from "userTextActivity"
                  where
                    "guildId" = ${itx.guild.id}
                    and "timestamp" between ${periodStart} and ${periodEnd}
                  group by "userId"
                  order by "total" ${sqlOrdering}
                  offset ${props.skip}
                  limit ${props.take};
                `;
              },
              async () => {
                const count = await prisma.userTextActivity.groupBy({
                  by: "userId",
                  where,
                });
                return count.length;
              },
              { pageSize: 30, defaultOrder: PaginatorOrder.DESC },
            );

            const formatEntry = (
              item: { userId: string; total: number; uniqueChannels: number },
              idx: number,
            ) => {
              return (
                `${idx}\\.` +
                ` <@${item.userId}> - ${item.total.toLocaleString("pl-PL")} ${pluralizers.messages(item.total)}` +
                ` [${item.uniqueChannels} #]`
              );
            };

            const paginator = new PaginatedView(
              paginate,
              `Ranking użytkowników na serwerze`,
              formatEntry,
              true,
              formatTimeRange(periodStart, periodEnd),
            );
            await paginator.render(itx);
          }),
      )

      .addCommand("wędka", (command) =>
        command
          .setDescription("Ranking wędkarzy")

          .addString("okres", (period) =>
            period.setDescription("Okres czasu, np. 2025-01").setRequired(false),
          )
          .handle(async ({ prisma }, { okres: rawPeriod }, itx) => {
            if (!itx.inCachedGuild()) return;

            const periodWhere: Prisma.TransactionWhereInput = {};
            let footer: string | null = null;
            if (rawPeriod) {
              const periodStart = parseDate(rawPeriod, "start", null);
              if (!periodStart) {
                return await errorFollowUp(
                  itx,
                  "Nieprawidłowy okres. Przykład: 2025-01",
                );
              }
              const periodEnd = endOfMonth(periodStart);
              periodWhere.createdAt = {
                gte: periodStart,
                lte: periodEnd,
              };
              footer = formatTimeRange(periodStart, periodEnd);
            }

            const where: Prisma.TransactionWhereInput = {
              wallet: { guildId: itx.guild.id },
              reason: { startsWith: "Łowienie" },
              transactionType: "add",
              entryType: "credit",
              ...periodWhere,
            };
            const paginate = new DatabasePaginator(
              (props, ordering) =>
                prisma.transaction.groupBy({
                  ...props,
                  by: "walletId",
                  where,
                  _count: true,
                  _sum: { amount: true },
                  orderBy: [{ _sum: { amount: ordering } }, { walletId: ordering }],
                }),
              async () => {
                const count = await prisma.transaction.groupBy({
                  by: "walletId",
                  where,
                });
                return count.length;
              },
              { pageSize: 30, defaultOrder: PaginatorOrder.DESC },
            );

            const wallets = await prisma.wallet.findMany({
              where: { guildId: itx.guild.id },
              select: { id: true, userId: true },
            });
            const walletToUserId = new Map<number, string>(
              wallets.map((wallet) => [wallet.id, wallet.userId]),
            );

            const paginator = new PaginatedView(
              paginate,
              "Ranking wędkarzy",
              (item, idx) => {
                const amountSum = item._sum.amount ?? 0;
                const userId = walletToUserId.get(item.walletId);
                return (
                  `${idx}\\.` +
                  ` <@${userId}> - ${amountSum.toLocaleString("pl-PL")} ${pluralizers.points(amountSum)} ` +
                  `[${item._count} :fishing_pole_and_fish:]`
                );
              },
              true,
              footer,
            );
            await paginator.render(itx);
          }),
      ),
  );
