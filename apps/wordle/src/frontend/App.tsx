import "./index.css";

import { type DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import { useLayoutEffect, useState } from "react";
import {
  fetchGuilds,
  getAccessToken,
  getAuthorizationCode,
  getGuildIconUrl,
} from "./discordApi";
import { useDiscordSdk } from "./sdk";

type AuthSession = Awaited<
  ReturnType<typeof DiscordSDK.prototype.commands.authenticate>
>;

export function App() {
  const { discordSdk } = useDiscordSdk("mock");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const [guild, setGuild] = useState<any | null>(null);

  useLayoutEffect(() => {
    patchUrlMappings([{ prefix: "/", target: "/.proxy" }]);
  });

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
    <div className="max-w-7xl mx-auto p-8 text-center">
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
