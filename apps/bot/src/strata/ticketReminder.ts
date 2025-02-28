import { Hashira } from "@hashira/core";
import type { GuildChannel } from "discord.js";
import { TICKET_REMINDER_SETTINGS } from "../specializedConstants";

export const ticketReminder = new Hashira({ name: "ticketReminder" }).handle(
  "channelCreate",
  async (_, channel: GuildChannel) => {
    const settings =
      TICKET_REMINDER_SETTINGS[
        channel.guild.id as keyof typeof TICKET_REMINDER_SETTINGS
      ];

    if (!settings) return;
    if (channel.parent?.id !== settings.CATEGORY) return;

    const pingChannel = await channel.client.channels.fetch(settings.TICKET_PING);

    if (!pingChannel?.isSendable()) return;

    await pingChannel.send({
      content: `Pojawił się nowy ticket: <#${channel.id}>\n\n@here`,
      allowedMentions: { parse: ["everyone"] },
    });
  },
);
