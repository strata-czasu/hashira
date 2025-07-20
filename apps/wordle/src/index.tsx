import Env from "@hashira/env";
import { serve } from "bun";
import {
  OAuth2Routes,
  type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import * as v from "valibot";
import index from "./frontend/index.html";

const client_id = Env.OAUTH_CLIENT_ID;
const client_secret = Env.OAUTH_CLIENT_SECRET;
if (!client_id || !client_secret) {
  throw new Error("OAuth client ID and secret must be set in the environment");
}
console.log("Using OAuth client ID:", client_id);

const ApiTokenRequestSchema = v.object({
  code: v.string(),
});

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/token": {
      async POST(req) {
        const { code } = v.parse(ApiTokenRequestSchema, await req.json());

        const tokenRes = await fetch(OAuth2Routes.tokenURL, {
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
          console.log("Error from oauth2 token exchange:", tokenRes);
          return Response.json(
            { message: "Failed to exchange code for token" },
            { status: tokenRes.status },
          );
        }

        const { access_token } =
          (await tokenRes.json()) as RESTPostOAuth2AccessTokenResult;
        return Response.json({ access_token });
      },
    },
  },

  error(error) {
    if (v.isValiError(error)) {
      return Response.json(
        { message: error.message, issues: error.issues },
        { status: 400 },
      );
    }
    throw error;
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
