import type { IDiscordSDK } from "@discord/embedded-app-sdk";
import { REST } from "@discordjs/rest";
import {
  CDNRoutes,
  ImageFormat,
  type ImageSize,
  type RESTGetAPICurrentUserGuildsResult,
  RouteBases,
  Routes,
} from "discord-api-types/v10";

export async function getAuthorizationCode(sdk: IDiscordSDK): Promise<string> {
  const { code } = await sdk.commands.authorize({
    client_id: sdk.clientId,
    response_type: "code",
    prompt: "none",
    scope: ["identify", "guilds"],
  });
  return code;
}

export async function fetchGuilds(accessToken: string) {
  return getRESTClient(accessToken).get(
    Routes.userGuilds(),
  ) as Promise<RESTGetAPICurrentUserGuildsResult>;
}

export function getGuildIconUrl(
  guildId: string,
  iconHash: string,
  size: ImageSize,
): string {
  const route = CDNRoutes.guildIcon(guildId, iconHash, ImageFormat.PNG);
  const url = new URL(route, RouteBases.cdn);
  return `${url}?${getCDNQueryParams(size)}`;
}

export function getRESTClient(accessToken?: string) {
  const rest = new REST({ authPrefix: "Bearer" });
  if (accessToken) rest.setToken(accessToken);
  return rest;
}

export function getCDNQueryParams(size: ImageSize) {
  return new URLSearchParams({ size: size.toString() });
}
