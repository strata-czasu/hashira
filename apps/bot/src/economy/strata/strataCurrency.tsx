import { Hashira, PaginatedView, waitForConfirmationV2 } from "@hashira/core";
import { DatabasePaginator, type Transaction, type Wallet } from "@hashira/db";
import { Container, H3, render, Separator, Subtext, TextDisplay } from "@hashira/jsx";
import { PaginatorOrder } from "@hashira/paginate";
import {
  bold,
  italic,
  PermissionFlagsBits,
  TimestampStyles,
  time,
  type User,
  userMention,
} from "discord.js";
import { base } from "../../base";
import { STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { ensureUserExists, ensureUsersExist } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import { fetchMembers } from "../../util/fetchMembers";
import { parseUserMentions } from "../../util/parseUsers";
import { pluralizers } from "../../util/pluralize";
import { EconomyError } from "../economyError";
import { addBalances, transferBalances } from "../managers/transferManager";
import { getDefaultWallet } from "../managers/walletManager";
import { formatBalance } from "../util";

const CURRENCY_SYMBOL = STRATA_CZASU_CURRENCY.symbol;

type FieldProps = {
  name: string;
  value: string;
};

function Field({ name, value }: FieldProps) {
  return <TextDisplay content={`${bold(name)}\n${value}`} />;
}

function BalanceCard({
  title,
  user,
  wallet,
}: {
  title: string;
  user: User;
  wallet: Wallet;
}) {
  return (
    <Container>
      <TextDisplay>
        <H3>{title}</H3>
      </TextDisplay>
      <Field name="Saldo" value={formatBalance(wallet.balance, CURRENCY_SYMBOL)} />
      <Field
        name="Portfel utworzony"
        value={`${time(wallet.createdAt, TimestampStyles.LongDateShortTime)} (${time(wallet.createdAt, TimestampStyles.RelativeTime)})`}
      />
      <Separator />
      <TextDisplay>
        <Subtext>ID użytkownika: {user.id}</Subtext>
      </TextDisplay>
    </Container>
  );
}

const getCounterpartyLabel = (transaction: Transaction): string | null => {
  if (!transaction.relatedUserId) return null;
  const mention = userMention(transaction.relatedUserId);
  if (transaction.transactionType === "add") return `przez ${mention}`;
  return transaction.entryType === "credit" ? `od ${mention}` : `dla ${mention}`;
};

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const sign = transaction.entryType === "credit" ? "+" : "-";
  const parts = [
    time(transaction.createdAt, TimestampStyles.LongDateShortTime),
    `${sign}${formatBalance(transaction.amount, CURRENCY_SYMBOL)}`,
    getCounterpartyLabel(transaction),
  ];
  const line = parts.filter((part) => part !== null).join(" ");
  const content = transaction.reason ? `${line} - ${italic(transaction.reason)}` : line;

  return <TextDisplay content={content} />;
}

function BulkOperationReport({
  heading,
  amountPerUser,
  recipientMentions,
  reason,
  remainingBalance = null,
}: {
  heading: string;
  amountPerUser: number;
  recipientMentions: string[];
  reason: string | null;
  remainingBalance?: number | null;
}) {
  const recipientCount = recipientMentions.length;

  return (
    <Container>
      <TextDisplay>
        <H3>{heading}</H3>
      </TextDisplay>
      <Field
        name="Kwota na użytkownika"
        value={formatBalance(amountPerUser, CURRENCY_SYMBOL)}
      />
      {recipientCount > 1 && (
        <Field
          name={`Łącznie (${recipientCount} ${pluralizers.users(recipientCount)})`}
          value={formatBalance(amountPerUser * recipientCount, CURRENCY_SYMBOL)}
        />
      )}
      {reason && <Field name="Powód" value={italic(reason)} />}
      {remainingBalance !== null && (
        <Field
          name="Saldo po operacji"
          value={formatBalance(remainingBalance, CURRENCY_SYMBOL)}
        />
      )}
      <Field
        name={`Odbiorcy (${recipientCount})`}
        value={recipientMentions.join(", ")}
      />
    </Container>
  );
}

export const strataCurrency = new Hashira({ name: "strata-currency" })
  .use(base)
  .group("punkty", (group) =>
    group
      .setDefaultMemberPermissions(0)
      .setDescription("Komendy do punktów")
      .addCommand("sprawdz", (command) =>
        command
          .setDescription("Sprawdź swoje punkty")
          .addUser("użytkownik", (option) =>
            option
              .setDescription("Użytkownik, którego punkty chcesz sprawdzić")
              .setRequired(false),
          )
          .handle(async ({ prisma }, { użytkownik: user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const targetUser = user ?? itx.user;

            await ensureUserExists(prisma, targetUser.id);

            const wallet = await getDefaultWallet({
              prisma,
              userId: targetUser.id,
              guildId: itx.guildId,
              currencySymbol: CURRENCY_SYMBOL,
            });

            const self = itx.user.id === targetUser.id;
            await itx.editReply(
              render(
                <BalanceCard
                  title={self ? "Twoje punkty" : `Punkty ${targetUser.tag}`}
                  user={targetUser}
                  wallet={wallet}
                />,
              ),
            );
          }),
      )
      .addCommand("historia", (command) =>
        command
          .setDescription("Sprawdź historię transakcji punktów")
          .addUser("użytkownik", (option) =>
            option
              .setDescription("Użytkownik, którego punkty chcesz sprawdzić")
              .setRequired(false),
          )
          .handle(async ({ prisma }, { użytkownik: user }, itx) => {
            if (!itx.inCachedGuild()) return;

            const targetUser = user ?? itx.user;

            await ensureUserExists(prisma, targetUser.id);

            const wallet = await getDefaultWallet({
              prisma,
              userId: targetUser.id,
              guildId: itx.guildId,
              currencySymbol: CURRENCY_SYMBOL,
            });

            const where = { walletId: wallet.id };
            const paginator = new DatabasePaginator(
              (props, createdAt) =>
                prisma.transaction.findMany({
                  ...props,
                  where,
                  orderBy: { createdAt },
                }),
              () => prisma.transaction.count({ where }),
              { pageSize: 15, defaultOrder: PaginatorOrder.DESC },
            );

            const view = new PaginatedView(
              paginator,
              `Transakcje ${targetUser.tag}`,
              (transaction) => <TransactionRow transaction={transaction} />,
              true,
              `Saldo: ${formatBalance(wallet.balance, CURRENCY_SYMBOL)}`,
            );
            await view.render(itx);
          }),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription("Przekaż punkty użytkownikowi")
          .addString("użytkownicy", (option) =>
            option.setDescription("Użytkownicy, którym chcesz przekazać punkty"),
          )
          .addInteger("ilość", (option) =>
            option.setDescription("Ilość punktów do przekazania").setMinValue(1),
          )
          .addString("powód", (option) =>
            option.setDescription("Powód przekazania punktów").setRequired(false),
          )
          .handle(
            async (
              { prisma, economyLog: log },
              { użytkownicy: rawMembers, ilość: amount, powód: reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const members = await fetchMembers(
                itx.guild,
                parseUserMentions(rawMembers),
              );
              if (members.size === 0) {
                await errorFollowUp(itx, "Nie znaleziono podanych użytkowników.");
                return;
              }

              const recipientIds = [...new Set(members.keys())].filter(
                (id) => id !== itx.user.id,
              );
              if (recipientIds.length === 0) {
                await errorFollowUp(itx, "Nie możesz przekazać punktów samemu sobie.");
                return;
              }

              await ensureUsersExist(prisma, [...recipientIds, itx.user.id]);

              const wallet = await getDefaultWallet({
                prisma,
                userId: itx.user.id,
                guildId: itx.guildId,
                currencySymbol: CURRENCY_SYMBOL,
              });

              const totalAmount = amount * recipientIds.length;
              const projectedBalance = wallet.balance - totalAmount;
              if (projectedBalance < 0) {
                await errorFollowUp(
                  itx,
                  `Masz niewystarczające środki. Potrzebujesz ${formatBalance(totalAmount, CURRENCY_SYMBOL)}, a masz na koncie ${formatBalance(wallet.balance, CURRENCY_SYMBOL)}.`,
                );
                return;
              }

              const confirmationLines = [
                `Czy na pewno chcesz przekazać ${formatBalance(amount, CURRENCY_SYMBOL)} każdemu z ${bold(recipientIds.length.toString())} ${pluralizers.genitiveUsers(recipientIds.length)} (łącznie ${formatBalance(totalAmount, CURRENCY_SYMBOL)})?`,
                `Twoje saldo po operacji: ${formatBalance(projectedBalance, CURRENCY_SYMBOL)}`,
              ];
              if (reason) {
                confirmationLines.push(`Powód: ${italic(reason)}`);
              }

              const confirmed = await waitForConfirmationV2(
                { send: itx.editReply.bind(itx) },
                <Container>
                  <TextDisplay>
                    <H3>Przekazanie punktów</H3>
                    {"\n"}
                    {confirmationLines.join("\n")}
                  </TextDisplay>
                </Container>,
                "Tak",
                "Nie",
                (action) => action.user.id === itx.user.id,
              );

              if (!confirmed) {
                await itx.editReply(
                  render(<TextDisplay content="Anulowano przekazywanie punktów." />),
                );
                return;
              }

              try {
                const { sourceWallet, recipientWallets } = await transferBalances({
                  prisma,
                  fromUserId: itx.user.id,
                  guildId: itx.guildId,
                  currencySymbol: CURRENCY_SYMBOL,
                  toUserIds: recipientIds,
                  amount,
                  reason,
                });
                log.push("currencyTransfer", itx.guild, {
                  fromUser: itx.user,
                  toUsers: members.map((m) => m.user),
                  amount,
                  reason,
                });

                const recipientsById = new Map(members.map((m) => [m.id, m]));
                const recipientMentions = recipientWallets.map(
                  (recipientWallet) =>
                    recipientsById.get(recipientWallet.userId)?.toString() ??
                    userMention(recipientWallet.userId),
                );

                await itx.editReply(
                  render(
                    <BulkOperationReport
                      heading="Przekazano punkty"
                      amountPerUser={amount}
                      recipientMentions={recipientMentions}
                      reason={reason}
                      remainingBalance={sourceWallet.balance}
                    />,
                  ),
                );
              } catch (error) {
                if (error instanceof EconomyError) {
                  await errorFollowUp(itx, error.message);
                  return;
                }
                throw error;
              }
            },
          ),
      ),
  )
  .command("punkty-dodaj", (command) =>
    command
      .setDescription("Dodaj punkty użytkownikowi/użytkownikom")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("ilość", (option) =>
        option.setDescription("Ilość punktów do dodania"),
      )
      .addString("użytkownicy", (option) =>
        option.setDescription("Użytkownicy, którym chcesz dodać punkty"),
      )
      .addString("powód", (option) =>
        option.setDescription("Powód dodania punktów").setRequired(false),
      )
      .handle(
        async (
          { prisma, economyLog: log },
          { ilość: amount, użytkownicy: rawMembers, powód: reason },
          itx,
        ) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          const members = await fetchMembers(itx.guild, parseUserMentions(rawMembers));
          if (members.size === 0) {
            await errorFollowUp(itx, "Nie znaleziono podanych użytkowników.");
            return;
          }

          const memberIds = [...new Set(members.keys())];
          await ensureUsersExist(prisma, [...memberIds, itx.user.id]);

          const totalAmount = Math.abs(amount) * memberIds.length;
          const confirmationLines = [
            `Czy na pewno chcesz dodać ${formatBalance(amount, CURRENCY_SYMBOL)} każdemu z ${bold(memberIds.length.toString())} ${pluralizers.genitiveUsers(memberIds.length)} (łącznie ${formatBalance(totalAmount, CURRENCY_SYMBOL)})?`,
          ];
          if (reason) {
            confirmationLines.push(`Powód: ${italic(reason)}`);
          }

          const confirmed = await waitForConfirmationV2(
            { send: itx.editReply.bind(itx) },
            <Container>
              <TextDisplay>
                <H3>Dodanie punktów</H3>
                {"\n"}
                {confirmationLines.join("\n")}
              </TextDisplay>
            </Container>,
            "Tak",
            "Nie",
            (action) => action.user.id === itx.user.id,
          );

          if (!confirmed) {
            await itx.editReply(
              render(<TextDisplay content="Anulowano dodawanie punktów." />),
            );
            return;
          }

          try {
            await addBalances({
              prisma,
              fromUserId: itx.user.id,
              guildId: itx.guildId,
              currencySymbol: CURRENCY_SYMBOL,
              toUserIds: memberIds,
              amount,
              reason,
            });
            log.push("currencyAdd", itx.guild, {
              moderator: itx.user,
              toUsers: members.map((m) => m.user),
              amount,
              reason,
            });

            const recipientMentions = memberIds.map(
              (id) => members.get(id)?.toString() ?? userMention(id),
            );

            await itx.editReply(
              render(
                <BulkOperationReport
                  heading="Dodano punkty"
                  amountPerUser={amount}
                  recipientMentions={recipientMentions}
                  reason={reason}
                />,
              ),
            );
          } catch (error) {
            if (error instanceof EconomyError) {
              await errorFollowUp(itx, error.message);
              return;
            }
            throw error;
          }
        },
      ),
  );
