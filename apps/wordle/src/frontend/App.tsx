import "./index.css";

import { DiscordSDK } from "@discord/embedded-app-sdk";
import { REST } from "@discordjs/rest";
import {
  CDNRoutes,
  ImageFormat,
  type ImageSize,
  type RESTGetAPICurrentUserGuildsResult,
  Routes,
} from "discord-api-types/v10";
import { useState } from "react";
import logo from "./logo.svg";
import reactLogo from "./react.svg";

// TODO)) Get this from somewhere more configurable
const OAUTH_CLIENT_ID = "1395837579861037216";

type AuthSession = Awaited<
  ReturnType<typeof DiscordSDK.prototype.commands.authenticate>
>;

export function App() {
  const [discordSdk] = useState(() => new DiscordSDK(OAUTH_CLIENT_ID));
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const [guild, setGuild] = useState<any | null>(null);

  const onAuthorizeClick = async () => {
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    const authorizationCode = await getAuthorizationCode(discordSdk);
    console.log("Authorization code received");

    const access_token = await getAccessToken(authorizationCode);
    console.log("Access token received");

    const session = await discordSdk.commands.authenticate({ access_token });
    console.log("Authenticated user:", session.user);
    setAuthSession(session);

    const guilds = await fetchGuilds(access_token);
    console.log(`User's in ${guilds.length} guilds`);
    const currentGuild = guilds.find((g) => g.id === discordSdk.guildId);
    setGuild(currentGuild ?? null);
  };

  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] scale-120"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-24 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-[spin_20s_linear_infinite]"
        />
      </div>

      <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
      <p>
        Edit <code className="bg-[#1a1a1a] px-2 py-1 font-mono">src/App.tsx</code> and
        save to test HMR
      </p>

      {authSession !== null ? (
        <p className="my-4">{`Welcome, ${authSession.user.username}!`}</p>
      ) : (
        <button
          type="button"
          className="px-4 py-2 my-4 text-white rounded bg-blue-600 hover:bg-blue-700 transition-colors"
          onClick={onAuthorizeClick}
        >
          Authorize
        </button>
      )}
      {guild && (
        <div className="my-4 gap-2 flex flex-col items-center">
          <img
            src={getGuildIconUrl(guild.id, guild.icon, 512)}
            alt="Guild icon"
            width={128}
            height={128}
            className="rounded-full"
          />
          <p>{guild.name}</p>
        </div>
      )}
    </div>
  );
}
export default App;

async function getAuthorizationCode(sdk: DiscordSDK): Promise<string> {
  const { code } = await sdk.commands.authorize({
    client_id: OAUTH_CLIENT_ID,
    response_type: "code",
    scope: ["identify", "guilds"],
  });
  return code;
}

async function getAccessToken(code: string): Promise<string> {
  const tokenRes = await fetch("/.proxy/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const { access_token } = await tokenRes.json();
  if (typeof access_token !== "string") {
    throw new Error("Invalid access token received");
  }

  return access_token;
}

async function fetchGuilds(accessToken: string) {
  return getRESTClient(accessToken).get(
    Routes.userGuilds(),
  ) as Promise<RESTGetAPICurrentUserGuildsResult>;
}

function getGuildIconUrl(guildId: string, iconHash: string, size: ImageSize): string {
  const route = CDNRoutes.guildIcon(guildId, iconHash, ImageFormat.PNG);
  const url = new URL(route, "https://cdn.discordapp.com");
  return `${url}?${getCDNQueryParams(size)}`;
}

function getRESTClient(accessToken: string) {
  return new REST({ authPrefix: "Bearer" }).setToken(accessToken);
}

function getCDNQueryParams(size: ImageSize) {
  return new URLSearchParams({ size: size.toString() });
}
