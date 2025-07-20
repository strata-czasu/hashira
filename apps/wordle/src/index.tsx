import Env from "@hashira/env";
import { serve } from "bun";
import { Routes } from "discord-api-types/v10";
import index from "./frontend/index.html";

const client_id = Env.OAUTH_CLIENT_ID;
const client_secret = Env.OAUTH_CLIENT_SECRET;
if (!client_id || !client_secret) {
  throw new Error("OAuth client ID and secret must be set in the environment");
}
console.log("Using OAuth client ID:", client_id);

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/token": {
      async POST(req) {
        const { code } = await req.json();
        if (!code) {
          return Response.json({ error: "Code is required" }, { status: 400 });
        }
        if (typeof code !== "string") {
          return Response.json({ error: "Invalid code format" }, { status: 400 });
        }

        const tokenRes = await fetch(Routes.oauth2TokenExchange(), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id,
            client_secret,
            grant_type: "authorization_code",
            code,
          }),
        });
        if (tokenRes.status !== 200) {
          console.log(tokenRes);
          return Response.json(
            { error: "Failed to exchange code for token" },
            { status: tokenRes.status },
          );
        }

        const { access_token } = await tokenRes.json();
        return Response.json({ access_token });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },

  port: 3000,
});

console.log(`Listening on http://${server.hostname}:${server.port}`);
