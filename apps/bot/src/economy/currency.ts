import { PermissionFlagsBits, TimestampStyles, time } from "discord.js";

import { Hashira, PaginatedView, waitForConfirmation } from "@hashira/core";
import { type Currency, DatabasePaginator, Prisma } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";

import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";
import {
  cutoverGuildCurrency,
  getCurrencyCutoverPreview,
  KAPSLE_CURRENCY,
} from "./managers/currencyCutoverService";
import {
  cleanupPostCutoverDailyRewards,
  getPostCutoverDailyCleanupPreview,
} from "./managers/postCutoverDailyCleanupService";
import { formatBalance } from "./util";

const formatCurrency = (
  { name, symbol, createdAt, createdBy, retiredAt }: Currency,
  showOwner = false,
) => {
  const formattedTime = time(createdAt, TimestampStyles.FullDateShortTime);
  const archived = retiredAt ? " - archived" : "";
  const base = `${name} - ${symbol} - ${formattedTime}${archived}`;

  return showOwner ? `${base} - <@${createdBy}>` : base;
};

type UserHolding = {
  userId: string;
  total: bigint;
  wallets: { name: string; balance: number }[];
};

export const currency = new Hashira({ name: "currency" })
  .use(base)
  .group("currency-admin", (group) =>
    group
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .setDescription("Currency admin commands")
      .addCommand("create", (createCommand) =>
        createCommand
          .setDescription("Create a new currency")
          .addString("name", (nameOption) => nameOption.setDescription("The name of the currency"))
          .addString("symbol", (symbolOption) =>
            symbolOption.setDescription("The symbol of the currency"),
          )
          .handle(async ({ prisma }, { name, symbol }, itx) => {
            if (!itx.inCachedGuild()) return;

            try {
              await prisma.currency.create({
                data: {
                  name,
                  symbol,
                  guildId: itx.guildId,
                  createdBy: itx.user.id,
                },
              });
            } catch (_) {
              await itx.reply("Currency with the same name or symbol already exists!");
              return;
            }

            await itx.reply("Currency created successfully!");
          }),
      )
      .addCommand("cutover", (command) =>
        command
          .setDescription("Archive the current currency and switch the guild to Kapsle")
          .addInteger("old-currency", (option) =>
            option.setDescription("ID of the current currency").setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            const focused = itx.options.getFocused().toString();
            const currencies = await prisma.currency.findMany({
              where: {
                guildId: itx.guildId,
                retiredAt: null,
                ...(focused
                  ? {
                      OR: [
                        { name: { contains: focused, mode: "insensitive" } },
                        { symbol: { contains: focused, mode: "insensitive" } },
                      ],
                    }
                  : {}),
              },
              take: 25,
            });
            await itx.respond(
              currencies.map((item) => ({
                name: `${item.name} (${item.symbol}) [${item.id}]`,
                value: item.id,
              })),
            );
          })
          .handle(async ({ prisma }, { "old-currency": oldCurrencyId }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const { oldCurrency, walletCount, preservedBalance, shopListingCount } =
              await getCurrencyCutoverPreview(prisma, itx.guildId, oldCurrencyId);
            const confirmed = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              [
                `Serwer: ${itx.guild.name} (${itx.guildId})`,
                `Stara waluta: ${oldCurrency.name} (${oldCurrency.symbol}), ID ${oldCurrency.id}`,
                `Nowa waluta: ${KAPSLE_CURRENCY.name} (${KAPSLE_CURRENCY.symbol})`,
                `Zachowane portfele: ${walletCount}, łączne saldo: ${formatBalance(preservedBalance, oldCurrency.symbol)}`,
                `Wyłączone oferty sklepu: ${shopListingCount}`,
                "Nowe salda Kapsli zaczną od zera.",
                "",
                "Czy wykonać cutover?",
              ].join("\n"),
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );
            if (!confirmed) {
              await itx.editReply({ content: "Anulowano cutover.", components: [] });
              return;
            }

            const result = await cutoverGuildCurrency({
              prisma,
              guildId: itx.guildId,
              oldCurrencyId,
              createdBy: itx.user.id,
            });
            await itx.editReply({
              content: `Cutover zakończony. Zarchiwizowano walutę ID ${result.oldCurrency.id}, utworzono Kapsle ID ${result.newCurrency.id} i wyłączono ${result.disabledShopListingCount} ofert sklepu.`,
              components: [],
            });
          }),
      )
      .addCommand("cleanup-cutover-daily", (command) =>
        command
          .setDescription("Reverse Daily rewards created after the Kapsle cutover")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const preview = await getPostCutoverDailyCleanupPreview(prisma, itx.guildId);
            const confirmed = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              [
                `Serwer: ${itx.guild.name} (${itx.guildId})`,
                `Waluta: ${preview.currency.name} (${preview.currency.symbol}), ID ${preview.currency.id}`,
                `Transakcje Daily do usunięcia: ${preview.transactionCount}`,
                `Portfele do skorygowania: ${preview.affectedWalletCount}`,
                `Zmiana sald do cofnięcia: ${formatBalance(preview.netAmount, preview.currency.symbol)}`,
                `Wpisy odbioru Daily do usunięcia: ${preview.redeemCount}`,
                "",
                "Czy wykonać cleanup? Operacja jest nieodwracalna.",
              ].join("\n"),
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );
            if (!confirmed) {
              await itx.editReply({ content: "Anulowano cleanup.", components: [] });
              return;
            }

            const result = await cleanupPostCutoverDailyRewards({
              prisma,
              guildId: itx.guildId,
            });
            await itx.editReply({
              content: `Cleanup zakończony. Usunięto ${result.transactionCount} transakcji Daily, skorygowano ${result.affectedWalletCount} portfeli o ${formatBalance(result.netAmount, result.currency.symbol)} i usunięto ${result.redeemCount} wpisów odbioru Daily.`,
              components: [],
            });
          }),
      ),
  )
  .group("currency", (group) =>
    group
      .setDMPermission(false)
      .setDescription("Currency related commands")
      .addGroup("list", (listGroup) =>
        listGroup
          .setDescription("Commands to list currencies")
          .addCommand("user", (userCommand) =>
            userCommand
              .setDescription("List all currencies of certain user")
              .addUser("user", (userOption) =>
                userOption.setDescription("The user to get stats for").setRequired(false),
              )
              .handle(async ({ prisma }, { user }, itx) => {
                if (!itx.inCachedGuild()) return;
                const userId = user?.id ?? itx.user.id;
                const guildId = itx.guildId;

                const where = { createdBy: userId, guildId };

                const paginate = new DatabasePaginator(
                  (props, createdAt) =>
                    prisma.currency.findMany({
                      ...props,
                      where,
                      orderBy: { createdAt },
                    }),
                  () => prisma.currency.count({ where }),
                );

                const paginator = new PaginatedView(
                  paginate,
                  "Currencies",
                  (item, idx) => `${idx}. ${formatCurrency(item)}`,
                );

                await paginator.render(itx);
              }),
          )
          .addCommand("guild", (guildCommand) =>
            guildCommand
              .setDescription("List all currencies of current guild")
              .handle(async ({ prisma }, _, itx) => {
                if (!itx.inCachedGuild()) return;

                const where = { guildId: itx.guildId };

                const paginate = new DatabasePaginator(
                  (props, createdAt) =>
                    prisma.currency.findMany({
                      ...props,
                      where,
                      orderBy: { createdAt },
                    }),
                  () => prisma.currency.count({ where }),
                );

                const paginator = new PaginatedView(
                  paginate,
                  "Currencies",
                  (item, idx) => `${idx}. ${formatCurrency(item, true)}`,
                );

                await paginator.render(itx);
              }),
          ),
      )
      .addCommand("holders", (holdersCommand) =>
        holdersCommand
          .setDescription("List all users holding a given currency")
          .addInteger("currency", (currencyOption) =>
            currencyOption
              .setDescription("The currency to check holders for")
              .setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
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
              currencies.map((c) => ({
                name: `${c.name} (${c.symbol})${c.retiredAt ? " [archived]" : ""}`,
                value: c.id,
              })),
            );
          })
          .handle(async ({ prisma }, { currency: currencyId }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const currencyData = await prisma.currency.findFirst({
              where: { id: currencyId, guildId: itx.guildId },
            });

            if (!currencyData) return errorFollowUp(itx, "Currency not found!");

            const totalResult = await prisma.wallet.aggregate({
              where: { currencyId, guildId: itx.guildId },
              _sum: { balance: true },
            });

            const totalBalance = totalResult._sum.balance ?? 0;

            const paginate = new DatabasePaginator(
              (props, ordering) => {
                const sqlOrdering = Prisma.sql([ordering]);
                return prisma.$queryRaw<UserHolding[]>`
                  SELECT
                    "userId",
                    SUM(balance) as total,
                    json_agg(json_build_object('name', name, 'balance', balance) ORDER BY balance DESC) as wallets
                  FROM wallet
                  WHERE currency = ${currencyId} AND "guildId" = ${itx.guildId}
                  GROUP BY "userId"
                  ORDER BY total ${sqlOrdering}
                  OFFSET ${props.skip}
                  LIMIT ${props.take}
                `;
              },
              async () => {
                const count = await prisma.wallet.groupBy({
                  by: ["userId"],
                  where: { currencyId, guildId: itx.guildId },
                });

                return count.length;
              },
              { pageSize: 10, defaultOrder: PaginatorOrder.DESC },
            );

            const formatUserEntry = (entry: UserHolding) => {
              const symbol = currencyData.symbol;
              const totalFormatted = formatBalance(Number(entry.total), symbol);
              const walletCount = entry.wallets.length;
              const walletBreakdown = entry.wallets
                .map((w) => `${w.name} (${formatBalance(w.balance, symbol)})`)
                .join(", ");
              return `<@${entry.userId}> - ${totalFormatted} across ${walletCount} wallet${walletCount === 1 ? "" : "s"}: ${walletBreakdown}`;
            };

            const totalFormatted = formatBalance(totalBalance, currencyData.symbol);
            const archived = currencyData.retiredAt ? " [archived]" : "";
            const title = `Holders of ${currencyData.name} (${currencyData.symbol})${archived}\nTotal: ${totalFormatted}`;

            const paginatedView = new PaginatedView(
              paginate,
              title,
              (entry, idx) => `${idx}. ${formatUserEntry(entry)}`,
              true,
            );

            await paginatedView.render(itx);
          }),
      ),
  );
