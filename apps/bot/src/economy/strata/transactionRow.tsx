/** @jsxImportSource @hashira/jsx */
import { italic, TimestampStyles, time, userMention } from "discord.js";

import type { Transaction } from "@hashira/db";
import { TextDisplay } from "@hashira/jsx";

import { formatBalance } from "../util";

const getCounterpartyLabel = (transaction: Transaction): string | null => {
  if (!transaction.relatedUserId) return null;
  const mention = userMention(transaction.relatedUserId);
  if (transaction.transactionType === "add") return `przez ${mention}`;
  return transaction.entryType === "credit" ? `od ${mention}` : `dla ${mention}`;
};

export function TransactionRow({
  transaction,
  currencySymbol,
}: {
  transaction: Transaction;
  currencySymbol: string;
}) {
  const sign = transaction.entryType === "credit" ? "+" : "-";
  const parts = [
    time(transaction.createdAt, TimestampStyles.LongDateShortTime),
    `${sign}${formatBalance(transaction.amount, currencySymbol)}`,
    getCounterpartyLabel(transaction),
  ];
  const line = parts.filter((part) => part !== null).join(" ");
  const content = transaction.reason ? `${line} - ${italic(transaction.reason)}` : line;

  return <TextDisplay content={content} />;
}
