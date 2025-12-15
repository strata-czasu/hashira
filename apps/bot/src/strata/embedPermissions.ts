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

export const embedPermissions = new Hashira({ name: "embed-permissions" })
  .use(base)
  .handle("messageCreate", async (_, message) => {
    if (message.author.bot || !message.inGuild()) return;
    if (message.embeds.length > 0 || message.attachments.size > 0) return;

    // Don't even check for users with embed permissions
    const permissions = message.channel.permissionsFor(message.author);
    if (!permissions) return;
    if (
      permissions?.has(PermissionFlagsBits.EmbedLinks) &&
      permissions?.has(PermissionFlagsBits.AttachFiles)
    )
      return;

    if (MEDIA_URL_PATTERNS.some((pattern) => pattern.test(message.content))) return;

    // TODO: Check if user got a reply at any point and don't reply

    await message.reply({ content: REPLY_IMAGE_URL });

    // TODO: Save to the db that we replied to this user
  });
