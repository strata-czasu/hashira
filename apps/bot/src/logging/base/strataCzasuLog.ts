import { Hashira } from "@hashira/core";
import { TimestampStyles, type User, bold, italic, time } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type UltimatumStartData = {
  user: User;
  createdAt: Date;
  expiresAt: Date;
  reason: string;
};
type UltimatumEndData = {
  user: User;
  createdAt: Date;
  endedAt: Date;
  reason: string;
};

export const strataCzasuLog = new Hashira({ name: "strataCzasuLog" }).const(
  "strataCzasuLog",
  new Logger()
    .addMessageType(
      "ultimatumStart",
      async (
        { timestamp },
        { user, createdAt, expiresAt, reason }: UltimatumStartData,
      ) => {
        const content = [
          bold("Rozpoczyna ultimatum"),
          `Poczatek: ${time(createdAt, TimestampStyles.RelativeTime)}`,
          `Koniec: ${time(expiresAt, TimestampStyles.RelativeTime)}`,
          `Powód: ${italic(reason)}`,
        ];
        return getLogMessageEmbed(user, timestamp)
          .setDescription(content.join("\n"))
          .setColor("Red");
      },
    )
    .addMessageType(
      "ultimatumEnd",
      async ({ timestamp }, { user, createdAt, endedAt, reason }: UltimatumEndData) => {
        const content = [
          bold("Kończy ultimatum"),
          `Poczatek: ${time(createdAt, TimestampStyles.RelativeTime)}`,
          `Koniec: ${time(endedAt, TimestampStyles.RelativeTime)}`,
          `Powód: ${italic(reason)}`,
        ];
        return getLogMessageEmbed(user, timestamp)
          .setDescription(content.join("\n"))
          .setColor("Green");
      },
    ),
);
