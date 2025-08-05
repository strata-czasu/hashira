import "./index.css";

import { type DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import { useLayoutEffect, useState } from "react";
import Wordle from "./Wordle";
import { useDiscordSdk } from "./sdk";

type AuthSession = Awaited<
  ReturnType<typeof DiscordSDK.prototype.commands.authenticate>
>;

export function App() {
  const { discordSdk, authenticate } = useDiscordSdk("mock");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useLayoutEffect(() => {
    patchUrlMappings([{ prefix: "/", target: "/.proxy" }]);
  });

  const onAuthorizeClick = async () => {
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    const session = await authenticate();
    setAuthSession(session);
  };

  return (
    <div className="max-w-7xl mx-auto p-8 text-center">
      <div className="text-5xl mb-4">Wordle</div>

      {discordSdk.guildId && authSession ? (
        <Wordle guildId={discordSdk.guildId} userId={authSession.user.id} />
      ) : (
        <button
          type="button"
          className="px-4 py-2 my-4 text-white rounded bg-blue-600 hover:bg-blue-700 transition-colors"
          onClick={onAuthorizeClick}
        >
          Authorize
        </button>
      )}
    </div>
  );
}
export default App;
