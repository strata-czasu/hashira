import { ChannelType, type Guild } from "discord.js";
import { uniq } from "es-toolkit";

const mentionRegex = /^<#(\d{17,20})>$/;
const idRegex = /^\d{17,20}$/;

const getFromIdOrMention = (idOrMention: string) => {
  const match = idOrMention.match(mentionRegex);
  if (match) return match[1] ?? null;
  return idRegex.test(idOrMention) ? idOrMention : null;
};

export const parseChannelMentions = (content: string) =>
  content
    .replaceAll("<", " <")
    .split(/\s+/)
    .map(getFromIdOrMention)
    .filter((id): id is string => !!id);

/** Expand category IDs into their current child channel IDs; keep non-category and unknown IDs as-is */
export const expandCategoryChannelIds = (
  guild: Guild,
  channelIds: readonly string[],
  { includeCategoryId = false }: { includeCategoryId?: boolean } = {},
) =>
  uniq(
    channelIds.flatMap((id) => {
      const channel = guild.channels.cache.get(id);
      if (channel?.type === ChannelType.GuildCategory) {
        return includeCategoryId
          ? [id, ...channel.children.cache.keys()]
          : [...channel.children.cache.keys()];
      }
      return [id];
    }),
  );
