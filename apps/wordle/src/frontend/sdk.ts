import { exchangeCodeForAccessToken, getBackendAccessToken } from "@/api/auth";
import {
  DiscordSDK,
  DiscordSDKMock,
  type IDiscordSDK,
} from "@discord/embedded-app-sdk";
import { useState } from "react";
import { getAuthorizationCode } from "./discordApi";

export type DiscordSDKMode = "mock" | "live";

// TODO)) Get this from somewhere more configurable
const OAUTH_CLIENT_ID = "1395837579861037216";
const MOCK_GUILD_ID = "342022299957854220";
const MOCK_CHANNEL_ID = "483273472555089930";

export type AuthSession = Awaited<
  ReturnType<typeof DiscordSDK.prototype.commands.authenticate>
>;

export type UseDiscordSDKReturn = {
  discordSdk: IDiscordSDK;
  sdkMode: DiscordSDKMode;
  authSession: AuthSession | null;
  // Access token for the backend API
  accessToken: string | null;
  authenticate: () => Promise<AuthSession>;
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
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const authenticate = async () => {
    if (!discordSdk.guildId) {
      throw new Error("Discord SDK is not initialized with a guild ID");
    }

    const authorizationCode = await getAuthorizationCode(discordSdk);
    console.log("Authorization code received");

    let discordAccessToken: string;
    if (sdkMode === "mock") {
      discordAccessToken = "MOCK_ACCESS_TOKEN";
      console.log("Using mock access token");
    } else {
      discordAccessToken = await exchangeCodeForAccessToken(authorizationCode);
      console.log("Access token received");
    }

    const session = await discordSdk.commands.authenticate({
      access_token: discordAccessToken,
    });
    console.log(`Authenticated user ${session.user.username} (${session.user.id})`);
    setAuthSession(session);

    const backendToken = await getBackendAccessToken(
      discordAccessToken,
      discordSdk.guildId,
    );
    console.log("Backend access token received");
    setAccessToken(backendToken);

    return session;
  };

  return {
    discordSdk,
    sdkMode,
    authSession,
    accessToken,
    authenticate,
  };
}
