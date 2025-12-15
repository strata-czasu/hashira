import { Hashira } from "@hashira/core";
import { PermissionFlagsBits } from "discord.js";
import { base } from "../base";

const REPLY_IMAGE_URL = "https://i.imgur.com/haYuB2P.gif";
const MEDIA_URL_PATTERNS = [
  new URLPattern({ pathname: "/*.:ext(jpg|jpeg|png|gif|webp|mp4|mov)" }),
  new URLPattern({ hostname: "*.tenor.com" }),
  new URLPattern({ hostname: "*.giphy.com" }),
  new URLPattern({ hostname: "*.imgur.com" }),
];

const REMINDER_TTL_SECONDS = 60 * 60 * 24; // 1 day

const getReminderKey = (userId: string, guildId: string) =>
  `embed-permissions:reminder:${guildId}:${userId}`;

export const embedPermissions = new Hashira({ name: "embed-permissions" })
  .use(base)
  .handle("messageCreate", async (ctx, message) => {
    if (message.author.bot || !message.inGuild()) return;
    if (message.embeds.length > 0 || message.attachments.size > 0) return;

    // Don't check users with embed permissions
    const permissions = message.channel.permissionsFor(message.author);
    if (!permissions) return;
    if (
      permissions?.has(PermissionFlagsBits.EmbedLinks) &&
      permissions?.has(PermissionFlagsBits.AttachFiles)
    )
      return;

    if (MEDIA_URL_PATTERNS.some((pattern) => pattern.test(message.content))) return;

    // Don't send the reminder if there was one in the last day
    const reminderKey = getReminderKey(message.author.id, message.guildId);
    const hasReceivedReminder = await ctx.redis.get(reminderKey);
    if (hasReceivedReminder) return;

    await message.reply({ content: REPLY_IMAGE_URL });

    await ctx.redis.set(reminderKey, "1", {
      expiration: { type: "EX", value: REMINDER_TTL_SECONDS },
    });
  });
