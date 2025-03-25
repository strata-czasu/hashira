import { Hashira } from "@hashira/core";
import { intervalToDuration } from "date-fns";
import { type Role, TimestampStyles, type User, bold, italic, time } from "discord.js";
import { formatDuration } from "../../util/duration";
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

type MassDmStartData = {
  user: User;
  createdAt: Date;
  role: Role;
  content: string;
};

type MassDmEndData = {
  user: User;
  createdAt: Date;
  endedAt: Date;
  role: Role;
  successfulMessages: number;
  failedMessages: number;
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
    )
    .addMessageType(
      "massdmStart",
      async ({ timestamp }, { user, createdAt, role, content }: MassDmStartData) => {
        const lines = [
          bold("Rozpoczęto wysyłanie masowych DM"),
          `Poczatek: ${time(createdAt, TimestampStyles.RelativeTime)}`,
          `Rola: ${role.name} (${role.id})`,
          `Treść: ${italic(content)}`,
        ];
        return getLogMessageEmbed(user, timestamp)
          .setDescription(lines.join("\n"))
          .setColor("Red");
      },
    )
    .addMessageType(
      "massdmEnd",
      async (
        { timestamp },
        {
          user,
          createdAt,
          endedAt,
          role,
          successfulMessages: sentMessages,
          failedMessages,
        }: MassDmEndData,
      ) => {
        const lines = [
          bold("Zakończono wysyłanie masowych DM"),
          `Poczatek: ${time(createdAt, TimestampStyles.RelativeTime)}`,
          `Koniec: ${time(endedAt, TimestampStyles.RelativeTime)}`,
          `Zajęło: ${formatDuration(intervalToDuration({ start: createdAt, end: endedAt }))}`,
          `Rola: ${role.name} (${role.id})`,
          `Wysłane wiadomości: ${sentMessages}`,
          `Nieudane wiadomości: ${failedMessages}`,
        ];

        return getLogMessageEmbed(user, timestamp)
          .setDescription(lines.join("\n"))
          .setColor("Green");
      },
    ),
);
