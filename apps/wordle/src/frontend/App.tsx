import "./index.css";

import { useLayoutEffect, useState } from "react";
import Wordle from "./Wordle";
import { type DiscordSDKMode, useDiscordSdk } from "./sdk";

const SDK_MODE: DiscordSDKMode = "live";

export function App() {
  const { discordSdk, authSession, accessToken, authenticate } =
    useDiscordSdk(SDK_MODE);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const startAuth = async () => {
    if (isAuthenticating) return;

    await discordSdk.ready();
    console.log("Discord SDK is ready");

    setIsAuthenticating(true);
    await authenticate();
    setIsAuthenticating(false);
  };

  // Automatically start authentication on app load
  useLayoutEffect(() => {
    if (authSession && accessToken) return;
    startAuth();
  });

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 md:p-8 text-center flex justify-center">
      <div className="w-full max-w-md">
        {discordSdk.guildId && authSession && accessToken ? (
          <Wordle
            guildId={discordSdk.guildId}
            userId={authSession.user.id}
            accessToken={accessToken}
          />
        ) : (
          <div>
            <div className="text-3xl sm:text-4xl md:text-5xl mb-4">Wordle</div>
            {isAuthenticating ? (
              <div className="text-gray-500">Logowanie...</div>
            ) : (
              <button
                type="button"
                className="px-4 py-2 my-4 text-white rounded bg-blue-600 hover:bg-blue-700 transition-colors"
                onClick={startAuth}
              >
                Zaloguj się przez Discord aby zagrać
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default App;
