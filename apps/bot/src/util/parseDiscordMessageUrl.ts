interface DiscordURLParts {
  guildId: string;
  channelId: string;
  messageId: string;
}

export default function parseDiscordUrl(url: string): DiscordURLParts | null {
  const regex =
    /^(?:https?:\/\/)?(?:canary\.|ptb\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
  const match = url.match(regex);

  if (!match) return null;

  const [_, guildId, channelId, messageId] = match;
  return { guildId, channelId, messageId } as DiscordURLParts;
}
