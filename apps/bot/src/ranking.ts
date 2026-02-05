import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, Prisma } from "@hashira/db";
import { type PaginatorItem, PaginatorOrder } from "@hashira/paginate";
import { endOfMonth } from "date-fns";
import { intervalToDuration, secondsToHours } from "date-fns/fp";
import { ChannelType, TimestampStyles, time, userMention } from "discord.js";
import { base } from "./base";
import { getChannelVoiceActivity } from "./userActivity/util";
import { parseDate } from "./util/dateParsing";
import { durationToSeconds, formatDuration, secondsToDuration } from "./util/duration";
import { errorFollowUp } from "./util/errorFollowUp";
import { parseChannelMentions } from "./util/parseChannels";
import { pluralizers } from "./util/pluralize";

/**
 * Parse a time range from raw input strings with an optional closing date.
 *
 * @param onError Callback which will be called before returning `null`.
 * @returns `[Date, Date]` if input is valid, `null` otherwise.
 */
async function parseTimeRange(
  rawStart: string,
  rawEnd: string | null,
  onError: (message: string) => Promise<void>,
): Promise<[Date, Date] | null> {
  const periodStart = parseDate(rawStart, "start", null);
  if (!periodStart) {
    await onError("Nieprawidłowy format początkowej daty. Przykład: 2025-01");
    return null;
  }

  if (rawEnd !== null) {
    const periodEnd = parseDate(rawEnd, "end", null);
    if (!periodEnd) {
      await onError("Nieprawidłowy format końcowej daty. Przykład: 2025-01-15");
      return null;
    }
    return [periodStart, periodEnd];
  }

  return [periodStart, endOfMonth(periodStart)];
}

function formatTimeRange(start: Date, end: Date) {
  return `${time(start, TimestampStyles.ShortDate)} - ${time(end, TimestampStyles.ShortDate)}`;
}

function isValidTimeRange(start: Date, end: Date) {
  const duration = intervalToDuration({ start, end });
  return durationToSeconds(duration) <= durationToSeconds({ days: 90 });
}

function formatFooter(total: string | number, periodStart: Date, periodEnd: Date) {
  const parts = [
    typeof total === "string"
      ? `Razem: ${total}`
      : `Razem: ${total.toLocaleString("pl-PL")}`,
    formatTimeRange(periodStart, periodEnd),
  ];
  return parts.join(" | ");
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
          .addString("od", (period) =>
            period.setDescription("Początek danych, np. 2025-01"),
          )
          .addString("do", (period) =>
            period
              .setDescription(
                "Koniec danych, np. 2025-01-15 (domyślnie koniec miesiąca)",
              )
              .setRequired(false),
          )
          .handle(async ({ prisma }, { user, od: rawStart, do: rawEnd }, itx) => {
            if (!itx.inCachedGuild()) return;

            const parsedTimeRange = await parseTimeRange(
              rawStart,
              rawEnd,
              async (message) => errorFollowUp(itx, message),
            );
            if (!parsedTimeRange) return;
            const [periodStart, periodEnd] = parsedTimeRange;

            if (!isValidTimeRange(periodStart, periodEnd)) {
              return await errorFollowUp(
                itx,
                "Przedział czasowy nie może być dłuższy niż 90 dni.",
              );
            }

            const where: Prisma.UserTextActivityWhereInput = {
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

            const formatEntry = (item: PaginatorItem<typeof paginate>, idx: number) => {
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
              formatFooter(
                await prisma.userTextActivity.count({ where }),
                periodStart,
                periodEnd,
              ),
            );
            await paginator.render(itx);
          }),
      )
      .addCommand("kanał", (command) =>
        command
          .setDescription("Ranking użytkowników na kanale")
          .addChannel("kanał", (channel) =>
            channel
              .setDescription("Kanał")
              .setChannelType(ChannelType.GuildText, ChannelType.GuildVoice),
          )
          .addString("od", (period) =>
            period.setDescription("Początek danych, np. 2025-01"),
          )
          .addString("do", (period) =>
            period
              .setDescription(
                "Koniec danych, np. 2025-01-15 (domyślnie koniec miesiąca)",
              )
              .setRequired(false),
          )
          .handle(
            async ({ prisma }, { kanał: channel, od: rawStart, do: rawEnd }, itx) => {
              if (!itx.inCachedGuild()) return;

              const parsedTimeRange = await parseTimeRange(
                rawStart,
                rawEnd,
                async (message) => errorFollowUp(itx, message),
              );
              if (!parsedTimeRange) return;
              const [periodStart, periodEnd] = parsedTimeRange;

              if (!isValidTimeRange(periodStart, periodEnd)) {
                return await errorFollowUp(
                  itx,
                  "Przedział czasowy nie może być dłuższy niż 90 dni.",
                );
              }

              if (channel.type === ChannelType.GuildText) {
                const where: Prisma.UserTextActivityWhereInput = {
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
                  item: PaginatorItem<typeof paginate>,
                  idx: number,
                ) => {
                  return (
                    `${idx}\\.` +
                    ` ${userMention(item.userId)} - ${item._count.toLocaleString("pl-PL")} ${pluralizers.messages(item._count)}`
                  );
                };

                const paginator = new PaginatedView(
                  paginate,
                  `Ranking wiadomości na kanale ${channel.name}`,
                  formatEntry,
                  true,
                  formatFooter(
                    await prisma.userTextActivity.count({ where }),
                    periodStart,
                    periodEnd,
                  ),
                );
                await paginator.render(itx);
              } else {
                const paginate = new DatabasePaginator(
                  async (props, ordering) => {
                    const sqlOrdering = Prisma.sql([ordering]);
                    const results = await prisma.$queryRaw<
                      Array<{ userId: string; totalSeconds: bigint }>
                    >`
                        select
                          vs."userId",
                          coalesce(sum(vst."secondsSpent"), 0)::bigint as "totalSeconds"
                        from "VoiceSession" vs
                        left join "VoiceSessionTotal" vst on vst."voiceSessionId" = vs.id
                          and not vst."isMuted"
                          and not vst."isDeafened"
                          and not vst."isAlone"
                        where
                          vs."guildId" = ${itx.guild.id}
                          and vs."channelId" = ${channel.id}
                          and vs."joinedAt" between ${periodStart} and ${periodEnd}
                        group by vs."userId"
                        having sum(vst."secondsSpent") > 0
                        order by "totalSeconds" ${sqlOrdering}, vs."userId" ${sqlOrdering}
                        offset ${props.skip}
                        limit ${props.take};
                      `;
                    return results.map((row) => ({
                      userId: row.userId,
                      totalSeconds: Number(row.totalSeconds),
                    }));
                  },
                  async () => {
                    const count = await prisma.voiceSession.groupBy({
                      by: "userId",
                      where: {
                        guildId: itx.guildId,
                        channelId: channel.id,
                        joinedAt: {
                          gte: periodStart,
                          lte: periodEnd,
                        },
                      },
                    });
                    return count.length;
                  },
                  { pageSize: 30, defaultOrder: PaginatorOrder.DESC },
                );

                const formatEntry = (
                  item: PaginatorItem<typeof paginate>,
                  idx: number,
                ) => {
                  const totalDuration = secondsToDuration(item.totalSeconds);
                  return (
                    `${idx}\\.` +
                    ` <@${item.userId}> - ${formatDuration(totalDuration)}`
                  );
                };

                const totalSeconds = await getChannelVoiceActivity({
                  prisma,
                  guildId: itx.guildId,
                  channelId: channel.id,
                  since: periodStart,
                  to: periodEnd,
                });

                const formattedTotal =
                  secondsToHours(totalSeconds) > 0
                    ? `${secondsToHours(totalSeconds)}h`
                    : `${formatDuration(secondsToDuration(totalSeconds))}`;

                const paginator = new PaginatedView(
                  paginate,
                  `Ranking głosowy na kanale ${channel.name}`,
                  formatEntry,
                  true,
                  formatFooter(formattedTotal, periodStart, periodEnd),
                );
                await paginator.render(itx);
              }
            },
          ),
      )
      .addCommand("serwer", (command) =>
        command
          .setDescription("Ranking kanałów na serwerze")
          .addString("od", (period) =>
            period.setDescription("Początek danych, np. 2025-01"),
          )
          .addString("do", (period) =>
            period
              .setDescription(
                "Koniec danych, np. 2025-01-15 (domyślnie koniec miesiąca)",
              )
              .setRequired(false),
          )
          .addString("kanały", (channels) =>
            channels.setDescription("Lista kanałów do wyświetlenia").setRequired(false),
          )
          .handle(
            async (
              { prisma },
              { od: rawStart, do: rawEnd, kanały: rawChannels },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              const parsedTimeRange = await parseTimeRange(
                rawStart,
                rawEnd,
                async (message) => errorFollowUp(itx, message),
              );
              if (!parsedTimeRange) return;
              const [periodStart, periodEnd] = parsedTimeRange;

              if (!isValidTimeRange(periodStart, periodEnd)) {
                return await errorFollowUp(
                  itx,
                  "Przedział czasowy nie może być dłuższy niż 90 dni.",
                );
              }

              const channels = rawChannels ? parseChannelMentions(rawChannels) : null;
              const where: Prisma.UserTextActivityWhereInput = {
                guildId: itx.guild.id,
                timestamp: {
                  gte: periodStart,
                  lte: periodEnd,
                },
                ...(channels ? { channelId: { in: channels } } : {}),
              };
              const channelFilterSql = channels
                ? Prisma.sql`and "channelId" in (${Prisma.join(channels)})`
                : Prisma.sql``;

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
                    ${channelFilterSql}
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
                item: PaginatorItem<typeof paginate>,
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
                formatFooter(
                  await prisma.userTextActivity.count({ where }),
                  periodStart,
                  periodEnd,
                ),
              );
              await paginator.render(itx);
            },
          ),
      )
      .addCommand("serwer-użytkownicy", (command) =>
        command
          .setDescription("Ranking użytkowników na serwerze")
          .addString("od", (period) =>
            period.setDescription("Początek danych, np. 2025-01"),
          )
          .addString("do", (period) =>
            period
              .setDescription(
                "Koniec danych, np. 2025-01-15 (domyślnie koniec miesiąca)",
              )
              .setRequired(false),
          )
          .handle(async ({ prisma }, { od: rawStart, do: rawEnd }, itx) => {
            if (!itx.inCachedGuild()) return;

            const parsedTimeRange = await parseTimeRange(
              rawStart,
              rawEnd,
              async (message) => errorFollowUp(itx, message),
            );
            if (!parsedTimeRange) return;
            const [periodStart, periodEnd] = parsedTimeRange;

            if (!isValidTimeRange(periodStart, periodEnd)) {
              return await errorFollowUp(
                itx,
                "Przedział czasowy nie może być dłuższy niż 90 dni.",
              );
            }

            const where: Prisma.UserTextActivityWhereInput = {
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

            const formatEntry = (item: PaginatorItem<typeof paginate>, idx: number) => {
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
              formatFooter(
                await prisma.userTextActivity.count({ where }),
                periodStart,
                periodEnd,
              ),
            );
            await paginator.render(itx);
          }),
      )

      .addCommand("wędka", (command) =>
        command
          .setDescription("Ranking wędkarzy")
          .addString("od", (period) =>
            period.setDescription("Początek danych, np. 2025-01").setRequired(false),
          )
          .addString("do", (period) =>
            period
              .setDescription(
                "Koniec danych, np. 2025-01-15 (domyślnie koniec miesiąca)",
              )
              .setRequired(false),
          )
          .handle(async ({ prisma }, { od: rawStart, do: rawEnd }, itx) => {
            if (!itx.inCachedGuild()) return;

            // No start specified, but end is specified
            if (!rawStart && rawEnd) {
              return await errorFollowUp(itx, "Nie podano początku okresu");
            }

            let period: [Date, Date] | null = null;

            // Start is not null, end is optional
            if (rawStart) {
              period = await parseTimeRange(rawStart, rawEnd, async (message) =>
                errorFollowUp(itx, message),
              );
              if (!period) return;
            }

            // Don't filter by start/end date by default if at least start date wasn't provided

            const where: Prisma.TransactionWhereInput = {
              wallet: { guildId: itx.guild.id },
              reason: { startsWith: "Łowienie" },
              transactionType: "add",
              entryType: "credit",
              ...(period ? { createdAt: { gte: period[0], lte: period[1] } } : {}),
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

            const formatEntry = (item: PaginatorItem<typeof paginate>, idx: number) => {
              const amountSum = item._sum.amount ?? 0;
              const userId = walletToUserId.get(item.walletId);
              return (
                `${idx}\\.` +
                ` <@${userId}> - ${amountSum.toLocaleString("pl-PL")} ${pluralizers.points(amountSum)} ` +
                `[${item._count} :fishing_pole_and_fish:]`
              );
            };

            const footerParts = [`Razem: ${await prisma.transaction.count({ where })}`];
            if (period) {
              footerParts.push(formatTimeRange(...period));
            }
            const paginator = new PaginatedView(
              paginate,
              "Ranking wędkarzy",
              formatEntry,
              true,
              footerParts.join(" | "),
            );
            await paginator.render(itx);
          }),
      ),
  );
