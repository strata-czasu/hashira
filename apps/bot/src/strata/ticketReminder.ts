import { Hashira } from "@hashira/core";
import { channelMention, type GuildChannel, roleMention } from "discord.js";
import { TICKET_REMINDER_SETTINGS } from "../specializedConstants";
import { getGuildSetting } from "../util/getGuildSetting";

export const ticketReminder = new Hashira({ name: "ticketReminder" }).handle(
  "channelCreate",
  async (_, channel: GuildChannel) => {
    const settings = getGuildSetting(TICKET_REMINDER_SETTINGS, channel.guild.id);
    if (!settings) return;

    if (channel.parent?.id !== settings.CATEGORY) return;

    const pingChannel = await channel.client.channels.fetch(settings.PING_CHANNEL);
    if (!pingChannel?.isSendable()) return;

    const ping = settings.PING_ROLE ? roleMention(settings.PING_ROLE) : "@here";

    await pingChannel.send({
      content: `Pojawił się nowy ticket: ${channelMention(channel.id)} (${channel.name})\n\n${ping}`,
      allowedMentions: settings.PING_ROLE
        ? { roles: [settings.PING_ROLE] }
        : { parse: ["everyone"] },
    });
  },
);
