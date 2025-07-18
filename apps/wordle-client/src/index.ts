import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import rocketLogo from "./rocket.png";
import "./style.css";

async function getAuthorizationCode(sdk: DiscordSDK): Promise<string> {
  const { code } = await sdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    scope: ["identify", "guilds"],
  });
  return code;
}

async function getAccessToken(code: string): Promise<string> {
  const tokenRes = await fetch("/api/token", {
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

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App element not found");
  }
  app.innerHTML = `
    <div>
      <img src="${rocketLogo}" class="logo" alt="Discord" />
      <h1>Hello, World!</h1>
    </div>
  `;
  console.log("App mounted");

  patchUrlMappings([{ prefix: "/", target: "/.proxy" }], { patchFetch: true });
  console.log("URL mappings patched");

  const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
  await discordSdk.ready();
  console.log("Discord SDK is ready");

  const authorizationCode = await getAuthorizationCode(discordSdk);
  console.log("Authorization code received");

  const access_token = await getAccessToken(authorizationCode);
  console.log("Access token received");

  const session = await discordSdk.commands.authenticate({ access_token });
  console.log("Authenticated user:", session.user);
  app.innerHTML += `
    <p>Welcome, ${session.user.username}!</p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  main()
    .then(() => {
      console.log("Main function executed successfully");
    })
    .catch((error) => {
      console.error("Error in main function:", error);
    });
});
