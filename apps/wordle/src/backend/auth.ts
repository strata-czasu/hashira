import type { BunRequest } from "bun";
import {
  OAuth2Routes,
  type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import env from "env";
import * as v from "valibot";

console.log("[auth] Using OAuth client ID:", env.WORDLE_OAUTH_CLIENT_ID);

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
          client_id: env.WORDLE_OAUTH_CLIENT_ID,
          client_secret: env.WORDLE_OAUTH_CLIENT_SECRET,
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
