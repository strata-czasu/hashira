import {
  DiscordSDK,
  DiscordSDKMock,
  type IDiscordSDK,
} from "@discord/embedded-app-sdk";
import { useState } from "react";

export type DiscordSDKMode = "mock" | "live";

// TODO)) Get this from somewhere more configurable
const OAUTH_CLIENT_ID = "1395837579861037216";
const MOCK_GUILD_ID = "342022299957854220";
const MOCK_CHANNEL_ID = "483273472555089930";

export type UseDiscordSDKReturn = {
  discordSdk: IDiscordSDK;
  sdkMode: DiscordSDKMode;
};

export function useDiscordSdk(sdkMode: DiscordSDKMode): UseDiscordSDKReturn {
  const [discordSdk] = useState(() => {
    if (sdkMode === "live") {
      return new DiscordSDK(OAUTH_CLIENT_ID);
    }

    if (!MOCK_GUILD_ID) {
      throw new Error("Mock guild ID must be set in mock SDK mode");
    }
    if (!MOCK_CHANNEL_ID) {
      throw new Error("Mock channel ID must be set in mock SDK mode");
    }
    console.debug("Using mock Discord SDK");
    console.debug("Client ID:", OAUTH_CLIENT_ID);
    console.debug("Guild ID:", MOCK_GUILD_ID);
    console.debug("Channel ID:", MOCK_CHANNEL_ID);
    return new DiscordSDKMock(OAUTH_CLIENT_ID, MOCK_GUILD_ID, MOCK_CHANNEL_ID, null);
  });

  return { discordSdk, sdkMode };
}
