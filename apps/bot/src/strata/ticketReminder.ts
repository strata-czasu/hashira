import { Hashira } from "@hashira/core";
import { channelMention, type GuildChannel } from "discord.js";
import { TICKET_REMINDER_SETTINGS } from "../specializedConstants";
import { getGuildSetting } from "../util/getGuildSetting";

export const ticketReminder = new Hashira({ name: "ticketReminder" }).handle(
  "channelCreate",
  async (_, channel: GuildChannel) => {
    const settings = getGuildSetting(TICKET_REMINDER_SETTINGS, channel.guild.id);
    if (!settings) return;

    if (channel.parent?.id !== settings.CATEGORY) return;

    const pingChannel = await channel.client.channels.fetch(settings.TICKET_PING);
    if (!pingChannel?.isSendable()) return;

    await pingChannel.send({
      content: `Pojawił się nowy ticket: ${channelMention(channel.id)} (${channel.name})\n\n@here`,
      allowedMentions: { parse: ["everyone"] },
    });
  },
);
