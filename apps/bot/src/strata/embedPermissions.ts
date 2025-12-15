import { Hashira } from "@hashira/core";
import { PermissionFlagsBits } from "discord.js";
import { base } from "../base";

const REPLY_IMAGE_URL = "https://i.imgur.com/haYuB2P.gif";

const IMAGE_URL = /https?:\/\/\S+\.(gif|png|jpe?g|webp|bmp|svg)(\?[^\s]*)?/gi;
const DISCORD_CDN_URL = /https?:\/\/cdn\.discordapp\.com\/attachments\/[\w/.-]+/gi;
const TENOR_URL = /https?:\/\/(www\.)?tenor\.com\/view\//gi;
const GIPHY_URL = /https?:\/\/(www\.)?giphy\.com\/(gifs|media)\//gi;
const IMGUR_URL = /https?:\/\/(www\.)?(i\.)?imgur\.com\/(a\/|gallery\/)?[\w]+/gi;

function hasEmbeddableContent(content: string): boolean {
  // Check for image file URLs specifically
  if (IMAGE_URL.test(content)) return true;

  // Should catch other non-image URLs
  if (DISCORD_CDN_URL.test(content)) return true;

  // Common image sharing sites
  if (TENOR_URL.test(content)) return true;
  if (GIPHY_URL.test(content)) return true;
  if (IMGUR_URL.test(content)) return true;

  return false;
}

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

    if (!hasEmbeddableContent(message.content)) return;

    // TODO: Check if user got a reply at any point and don't reply

    await message.reply({ content: REPLY_IMAGE_URL });

    // TODO: Save to the db that we replied to this user
  });
