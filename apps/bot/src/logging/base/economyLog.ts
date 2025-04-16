import { Hashira } from "@hashira/core";
import type { Item } from "@hashira/db";
import { type User, bold, inlineCode, italic, userMention } from "discord.js";
import { formatBalance } from "../../economy/util";
import { STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { pluralizers } from "../../util/pluralize";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type CurrencyTransferData = {
  fromUser: User;
  toUsers: User[];
  amount: number;
  reason: string | null;
};
type CurrencyAddData = {
  moderator: User;
  toUsers: User[];
  amount: number;
  reason: string | null;
};

type ItemTransferData = {
  fromUser: User;
  toUser: User;
  item: Item;
};
type ItemAddToOrRemoveFromInventoryData = {
  moderator: User;
  user: User;
  item: Item;
};

export const economyLog = new Hashira({ name: "economyLog" }).const(
  "economyLog",
  new Logger()
    .addMessageType(
      "currencyTransfer",
      async (
        { timestamp },
        { fromUser, toUsers, amount, reason }: CurrencyTransferData,
      ) => {
        const formattedAmount = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

        const lines: string[] = [];
        if (toUsers.length === 1) {
          const [user] = toUsers;
          if (!user) throw new Error("Invalid state: user is undefined");
          lines.push(`Przekazuje ${formattedAmount} dla ${userMention(user.id)}`);
        } else {
          const userMentions = toUsers.map((user) => user.toString()).join(", ");
          const totalAmount = amount * toUsers.length;
          lines.push(
            `Przekazuje ${formattedAmount} ${toUsers.length} ${pluralizers.users(
              toUsers.length,
            )}: ${userMentions}`,
            `**Razem**: ${formatBalance(totalAmount, STRATA_CZASU_CURRENCY.symbol)}`,
          );
        }

        if (reason !== null) {
          lines.push(`**Powód**: ${italic(reason)}`);
        }

        return getLogMessageEmbed(fromUser, timestamp)
          .setColor("Yellow")
          .setDescription(lines.join("\n"));
      },
    )
    .addMessageType(
      "currencyAdd",
      async (
        { timestamp },
        { moderator, toUsers, amount, reason }: CurrencyAddData,
      ) => {
        const embed = getLogMessageEmbed(moderator, timestamp).setColor("Green");
        const formattedAmount = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

        const lines: string[] = [];
        if (toUsers.length === 1) {
          const [user] = toUsers;
          if (!user) throw new Error("Invalid state: user is undefined");
          lines.push(`Dodaje ${formattedAmount} dla ${userMention(user.id)}`);
        } else {
          const userMentions = toUsers.map((user) => user.toString()).join(", ");
          const totalAmount = amount * toUsers.length;
          lines.push(
            `Dodaje ${formattedAmount} ${toUsers.length} ${pluralizers.users(
              toUsers.length,
            )}: ${userMentions}`,
            `**Razem**: ${formatBalance(totalAmount, STRATA_CZASU_CURRENCY.symbol)}`,
          );
        }

        if (amount >= 0) {
          embed.setColor("Green");
        } else {
          embed.setColor("Red");
        }

        if (reason !== null) {
          lines.push(`**Powód**: ${italic(reason)}`);
        }

        embed.setDescription(lines.join("\n"));
        return embed;
      },
    )
    .addMessageType(
      "itemTransfer",
      async ({ timestamp }, { fromUser, toUser, item }: ItemTransferData) => {
        return getLogMessageEmbed(fromUser, timestamp)
          .setDescription(
            `Przekazuje ${bold(item.name)} [${inlineCode(item.id.toString())}] dla ${userMention(toUser.id)}`,
          )
          .setColor("Yellow");
      },
    )
    .addMessageType(
      "itemAddToInventory",
      async (
        { timestamp },
        { moderator, user, item }: ItemAddToOrRemoveFromInventoryData,
      ) => {
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(
            `Dodaje ${bold(item.name)} [${inlineCode(item.id.toString())}] do ekwipunku ${userMention(user.id)}`,
          )
          .setColor("Green");
      },
    )
    .addMessageType(
      "itemRemoveFromInventory",
      async (
        { timestamp },
        { moderator, user, item }: ItemAddToOrRemoveFromInventoryData,
      ) => {
        return getLogMessageEmbed(moderator, timestamp)
          .setDescription(
            `Zabiera ${bold(item.name)} [${inlineCode(item.id.toString())}] z ekwipunku ${userMention(user.id)}`,
          )
          .setColor("Red");
      },
    ),
);
