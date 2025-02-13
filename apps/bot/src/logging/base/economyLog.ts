import { Hashira } from "@hashira/core";
import type { Item } from "@hashira/db";
import { type User, bold, inlineCode, userMention } from "discord.js";
import { formatBalance, pluralizeUsers } from "../../economy/util";
import { STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type CurrencyTransferData = {
  fromUser: User;
  toUsers: User[];
  amount: number;
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
      async ({ timestamp }, { fromUser, toUsers, amount }: CurrencyTransferData) => {
        const formattedAmount = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);
        const embed = getLogMessageEmbed(fromUser, timestamp).setColor("Yellow");

        if (toUsers.length === 1) {
          const [user] = toUsers;
          if (!user) throw new Error("Invalid state: user is undefined");
          embed.setDescription(
            `Przekazuje ${formattedAmount} dla ${userMention(user.id)}`,
          );
        } else {
          const userMentions = toUsers.map((user) => user.toString()).join(", ");
          const totalAmount = amount * toUsers.length;
          const lines = [
            `Przekazuje ${formattedAmount} ${toUsers.length} ${pluralizeUsers(
              toUsers.length,
            )}: ${userMentions}`,
            `Razem: ${formatBalance(totalAmount, STRATA_CZASU_CURRENCY.symbol)}`,
          ];
          embed.setDescription(lines.join("\n"));
        }

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
