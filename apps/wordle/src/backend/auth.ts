import { REST } from "@discordjs/rest";
import type { BunRequest } from "bun";
import { add } from "date-fns";
import {
  OAuth2Routes,
  type RESTGetAPICurrentUserResult,
  type RESTPostOAuth2AccessTokenResult,
  Routes,
} from "discord-api-types/v10";
import env from "env";
import * as jose from "jose";
import * as v from "valibot";
import { authenticateRequest } from "./util";

console.log("[auth] Using OAuth client ID:", env.WORDLE_PUBLIC_OAUTH_CLIENT_ID);

const ApiTokenRequestSchema = v.object({
  code: v.string(),
});

const ApiSessionRequestSchema = v.object({
  accessToken: v.string(),
  guildId: v.string(),
});

export const authApi = {
  // Exchange client authorization code for Discord access token
  "/api/auth/token": {
    async POST(req: BunRequest<"/api/auth/token">): Promise<Response> {
      const { code } = v.parse(ApiTokenRequestSchema, await req.json());

      const tokenRes = await fetch(OAuth2Routes.tokenURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: env.WORDLE_PUBLIC_OAUTH_CLIENT_ID,
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
  // Sign our own token
  "/api/auth/session": {
    async POST(req: BunRequest<"/api/auth/session">): Promise<Response> {
      const { accessToken, guildId } = v.parse(
        ApiSessionRequestSchema,
        await req.json(),
      );

      const rest = new REST({ authPrefix: "Bearer" });
      rest.setToken(accessToken);

      let user: RESTGetAPICurrentUserResult;
      try {
        user = (await rest.get(Routes.user("@me"))) as RESTGetAPICurrentUserResult;
      } catch (e) {
        return Response.json({ message: "Failed to fetch user info" }, { status: 400 });
      }

      const jwtExpiry = add(new Date(), { hours: 1 });
      const jwtSecret = new TextEncoder().encode(env.WORDLE_JWT_SECRET);
      const jwt = await new jose.SignJWT({ userId: user.id, guildId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(env.WORDLE_PUBLIC_OAUTH_CLIENT_ID)
        .setIssuedAt()
        .setExpirationTime(jwtExpiry)
        .sign(jwtSecret);

      return Response.json({ token: jwt }, { status: 201 });
    },
  },
  "/api/auth/session/verify": {
    async POST(req: BunRequest<"/api/auth/session/verify">): Promise<Response> {
      const { userId, guildId } = await authenticateRequest(req);

      return Response.json({ userId, guildId }, { status: 200 });
    },
  },
};
