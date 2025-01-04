import { Hashira } from "@hashira/core";
import type { Item } from "@hashira/db";
import { type User, bold, inlineCode, userMention } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

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
