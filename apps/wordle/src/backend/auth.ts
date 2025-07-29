import Env from "@hashira/env";
import type { BunRequest } from "bun";
import {
  OAuth2Routes,
  type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import * as v from "valibot";

const client_id = Env.OAUTH_CLIENT_ID;
const client_secret = Env.OAUTH_CLIENT_SECRET;
if (!client_id || !client_secret) {
  throw new Error("OAuth client ID and secret must be set in the environment");
}
console.log("[auth] Using OAuth client ID:", client_id);

const ApiTokenRequestSchema = v.object({
  code: v.string(),
});

export const authApi = {
  "/api/auth/token": {
    async POST(req: BunRequest<"/api/auth/token">): Promise<Response> {
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
};
