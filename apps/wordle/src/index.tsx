import Env from "@hashira/env";
import { randomUUIDv7, serve } from "bun";
import {
  OAuth2Routes,
  type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import { randomInt } from "es-toolkit";
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

type Game = {
  id: string;
  userId: string;
  solution: string;
};
const games: Game[] = [];
const GetGameRequestSchema = v.object({
  userId: v.string(),
});
const GameGuessRequestSchema = v.object({
  guess: v.string(),
});

// TODO)) Get the wordlist from DB
const WORDLE_WORDS = ["fishy", "crane", "abcde", "ports", "fizzy"];

function getRandomWord(): string {
  // biome-ignore lint/style/noNonNullAssertion: Prototype
  return WORDLE_WORDS[randomInt(WORDLE_WORDS.length)]!;
}

class NotFoundError extends Error {}

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

    "/api/game": {
      async POST(req) {
        const { userId } = v.parse(GetGameRequestSchema, await req.json());

        // TODO)) Use a DB
        let game = games.find((g) => g.userId === userId);
        if (!game) {
          game = { id: randomUUIDv7(), userId, solution: getRandomWord() };
          games.push(game);
          console.log("Created game", game);
        }
        console.log("Found game", game);

        return Response.json({
          id: game.id,
          userId: game.userId,
        });
      },
    },
    "/api/game/:id/guess": {
      async POST(req) {
        const game = games.find((g) => g.id === req.params.id);
        if (!game) throw new NotFoundError();

        const { guess } = v.parse(GameGuessRequestSchema, await req.json());
        // TODO)) We need to know on which position the letter is correct/present/etc
        // NOTE)) Absent letters don't require a position
        const correct: string[] = [];
        const present: string[] = [];
        const absent: string[] = [];
        let idx = 0;
        for (const letter of guess.split("")) {
          if (letter === game.solution[idx]) correct.push(letter);
          else if (game.solution.includes(letter)) present.push(letter);
          else absent.push(letter);
          idx++;
        }

        return Response.json({
          id: game.id,
          correct,
          present,
          absent,
        });
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
    if (error instanceof NotFoundError) {
      return Response.json({ message: "Not found" }, { status: 404 });
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
