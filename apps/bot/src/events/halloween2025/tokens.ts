import { Hashira, PaginatedView } from "@hashira/core";
import {
  DatabasePaginator,
  type ExtendedPrismaClient,
  type Transaction,
} from "@hashira/db";
import { nestedTransaction } from "@hashira/db/transaction";
import { PaginatorOrder } from "@hashira/paginate";
import { italic, PermissionFlagsBits, TimestampStyles, time } from "discord.js";
import { base } from "../../base";
import {
  EconomyError,
  InsufficientBalanceError,
  InvalidAmountError,
  SelfTransferError,
} from "../../economy/economyError";
import { getCurrency } from "../../economy/managers/currencyManager";
import { addBalances } from "../../economy/managers/transferManager";
import { getDefaultWallet } from "../../economy/managers/walletManager";
import { formatBalance } from "../../economy/util";
import { ensureUserExists, ensureUsersExist } from "../../util/ensureUsersExist";
import { fetchMembers } from "../../util/fetchMembers";
import { parseUserMentions } from "../../util/parseUsers";
import { pluralizers } from "../../util/pluralize";
import { TOKENY_CURRENCY } from "./seedData";

/** Maximum number of tokens a user can receive via transfers */
const TOKEN_TRANSFER_LIMIT = 50;

/**
 * Get the total amount of tokens received by a user via transfers
 */
const getReceivedTokens = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  receiverId: string,
): Promise<number> => {
  const result = await prisma.halloween2025TokenTransfer.aggregate({
    where: { guildId, receiverId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
};

export class TokenTransferLimitExceededError extends EconomyError {
  public readonly currentReceived: number;
  public readonly limit: number;
  public readonly requestedAmount: number;

  constructor(currentReceived: number, limit: number, requestedAmount: number) {
    super(
      `Token transfer limit exceeded: ${currentReceived}/${limit}, requested: ${requestedAmount}`,
    );
    this.currentReceived = currentReceived;
    this.limit = limit;
    this.requestedAmount = requestedAmount;
  }
}

/**
 * Transfer tokens with transfer limit enforcement (receiver side only)
 */
const transferTokensWithLimit = async ({
  prisma,
  fromUserId,
  toUserId,
  guildId,
  amount,
  reason,
}: {
  prisma: ExtendedPrismaClient;
  fromUserId: string;
  toUserId: string;
  guildId: string;
  amount: number;
  reason: string | null;
}) => {
  return await prisma.$transaction(async (tx) => {
    if (amount <= 0) throw new InvalidAmountError();
    if (fromUserId === toUserId) throw new SelfTransferError();

    // Ensure currency exists
    await getCurrency({
      prisma: tx,
      guildId,
      currencySymbol: TOKENY_CURRENCY.symbol,
    });

    const fromWallet = await getDefaultWallet({
      prisma: nestedTransaction(tx),
      userId: fromUserId,
      guildId,
      currencySymbol: TOKENY_CURRENCY.symbol,
    });

    if (fromWallet.balance < amount) throw new InsufficientBalanceError();

    // Check transfer limit for receiver
    const currentReceived = await getReceivedTokens(
      nestedTransaction(tx),
      guildId,
      toUserId,
    );
    if (currentReceived + amount > TOKEN_TRANSFER_LIMIT) {
      throw new TokenTransferLimitExceededError(
        currentReceived,
        TOKEN_TRANSFER_LIMIT,
        amount,
      );
    }

    const toWallet = await getDefaultWallet({
      prisma: nestedTransaction(tx),
      userId: toUserId,
      guildId,
      currencySymbol: TOKENY_CURRENCY.symbol,
    });

    // Perform the transfer
    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: {
        balance: { decrement: amount },
        transactions: {
          create: {
            relatedUserId: toUserId,
            relatedWalletId: toWallet.id,
            amount,
            reason,
            entryType: "debit",
            transactionType: "transfer",
          },
        },
      },
    });

    await tx.wallet.update({
      where: { id: toWallet.id },
      data: {
        balance: { increment: amount },
        transactions: {
          create: {
            relatedUserId: fromUserId,
            relatedWalletId: fromWallet.id,
            amount,
            reason,
            entryType: "credit",
            transactionType: "transfer",
          },
        },
      },
    });

    // Record transfer on receiver side
    await tx.halloween2025TokenTransfer.create({
      data: { guildId, receiverId: toUserId, amount },
    });
  });
};

export const tokens = new Hashira({ name: "tokens" })
  .use(base)
  .group("tokeny", (group) =>
    group
      .setDefaultMemberPermissions(0)
      .setDescription("Komendy do tokenów")
      .addCommand("sprawdz", (command) =>
        command
          .setDescription("Sprawdź swoje tokeny")
          .addUser("użytkownik", (option) =>
            option
              .setDescription("Użytkownik, którego tokeny chcesz sprawdzić")
              .setRequired(false),
          )
          .handle(async ({ prisma }, { użytkownik: user }, itx) => {
            if (!itx.inCachedGuild()) return;

            const userId = user?.id ?? itx.user.id;

            await ensureUserExists(prisma, userId);

            const wallet = await getDefaultWallet({
              prisma,
              userId,
              guildId: itx.guildId,
              currencySymbol: TOKENY_CURRENCY.symbol,
            });

            const receivedTokens = await getReceivedTokens(prisma, itx.guildId, userId);

            const self = itx.user.id === userId;
            const balance = formatBalance(wallet.balance, TOKENY_CURRENCY.symbol);
            const limitInfo = `(otrzymano z transferów: ${receivedTokens}/${TOKEN_TRANSFER_LIMIT})`;
            if (self) {
              await itx.reply(`Masz na swoim koncie: ${balance} ${limitInfo}`);
            } else {
              await itx.reply(
                `Użytkownik ${user} ma na swoim koncie: ${balance} ${limitInfo}`,
              );
            }
          }),
      )
      .addCommand("historia", (command) =>
        command
          .setDescription("Sprawdź historię transakcji tokenów")
          .addUser("użytkownik", (option) =>
            option
              .setDescription("Użytkownik, którego tokeny chcesz sprawdzić")
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
              currencySymbol: TOKENY_CURRENCY.symbol,
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

            const formatTransaction = (transaction: Transaction) => {
              const parts: string[] = [
                time(transaction.createdAt, TimestampStyles.ShortDateTime),
                formatBalance(transaction.amount, TOKENY_CURRENCY.symbol),
              ];
              if (transaction.reason) {
                parts.push(`- ${italic(transaction.reason)}`);
              }
              return parts.join(" ");
            };
            const view = new PaginatedView(
              paginator,
              `Transakcje tokenów ${targetUser.tag}`,
              formatTransaction,
              true,
            );
            await view.render(itx);
          }),
      )
      .addCommand("dodaj", (command) =>
        command
          .setDescription("[KADRA] Dodaj tokeny użytkownikowi")
          .addInteger("ilość", (option) =>
            option.setDescription("Ilość tokenów do dodania"),
          )
          .addString("użytkownicy", (option) =>
            option.setDescription("Użytkownicy, którym chcesz dodać tokeny"),
          )
          .addString("powód", (option) =>
            option.setDescription("Powód dodania tokenów").setRequired(false),
          )
          .handle(
            async (
              { prisma, economyLog: log },
              { ilość: amount, użytkownicy: rawMembers, powód: reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              // Check if the user has moderate members permission
              if (!itx.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
                await itx.reply("Nie masz uprawnień do dodawania tokenów");
                return;
              }

              const members = await fetchMembers(
                itx.guild,
                parseUserMentions(rawMembers),
              );

              await ensureUsersExist(prisma, [...members.keys(), itx.user.id]);

              try {
                await addBalances({
                  prisma,
                  fromUserId: itx.user.id,
                  guildId: itx.guildId,
                  currencySymbol: TOKENY_CURRENCY.symbol,
                  toUserIds: [...members.keys()],
                  amount,
                  reason,
                });
              } catch (error) {
                if (error instanceof EconomyError) {
                  await itx.reply(error.message);
                  return;
                }
                throw error;
              }
              log.push("currencyAdd", itx.guild, {
                moderator: itx.user,
                toUsers: members.map((m) => m.user),
                amount,
                reason,
              });

              const amountFormatted = formatBalance(amount, TOKENY_CURRENCY.symbol);

              await itx.reply(
                `Dodano ${amountFormatted} ${members.size} ${pluralizers.users(members.size)}.`,
              );
            },
          ),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription(
            "Przekaż tokeny użytkownikowi (max 50 tokenów można otrzymać)",
          )
          .addUser("użytkownik", (option) =>
            option.setDescription("Użytkownik, któremu chcesz przekazać tokeny"),
          )
          .addInteger("ilość", (option) =>
            option.setDescription("Ilość tokenów do przekazania").setMinValue(1),
          )
          .addString("powód", (option) =>
            option.setDescription("Powód przekazania tokenów").setRequired(false),
          )
          .handle(
            async (
              { prisma, economyLog: log },
              { użytkownik: user, ilość: amount, powód: reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              await ensureUsersExist(prisma, [user.id, itx.user.id]);

              try {
                await transferTokensWithLimit({
                  prisma,
                  fromUserId: itx.user.id,
                  toUserId: user.id,
                  guildId: itx.guildId,
                  amount,
                  reason,
                });
              } catch (error) {
                if (error instanceof TokenTransferLimitExceededError) {
                  const remaining = error.limit - error.currentReceived;
                  await itx.reply(
                    `Użytkownik ${user} może otrzymać jeszcze maksymalnie ${remaining} tokenów z transferów (${error.currentReceived}/${error.limit}).`,
                  );
                  return;
                }
                if (error instanceof SelfTransferError) {
                  await itx.reply("Nie możesz przekazać tokenów samemu sobie.");
                  return;
                }
                if (error instanceof EconomyError) {
                  await itx.reply(error.message);
                  return;
                }
                throw error;
              }
              log.push("currencyTransfer", itx.guild, {
                fromUser: itx.user,
                toUsers: [user],
                amount,
                reason,
              });

              const amountFormatted = formatBalance(amount, TOKENY_CURRENCY.symbol);

              await itx.reply(`Przekazano ${amountFormatted} dla ${user}.`);
            },
          ),
      ),
  );
