import Env from "@hashira/env";
import { randomUUIDv7, serve } from "bun";
import {
  OAuth2Routes,
  type RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import * as v from "valibot";
import {
  ApiError,
  GameAlreadyActiveError,
  GameAlreadyFinishedError,
  GameNotActiveError,
  NotFoundError,
  UnauthorizedError,
} from "./error";
import index from "./frontend/index.html";
import {
  type Game,
  WORDLE_ATTEMPTS,
  getRandomWord,
  mergeValidationResults,
  validateGuess,
} from "./game";

const client_id = Env.OAUTH_CLIENT_ID;
const client_secret = Env.OAUTH_CLIENT_SECRET;
if (!client_id || !client_secret) {
  throw new Error("OAuth client ID and secret must be set in the environment");
}
console.log("Using OAuth client ID:", client_id);

const ApiTokenRequestSchema = v.object({
  code: v.string(),
});

const games: Game[] = [];
const GetGameRequestSchema = v.object({
  userId: v.string(),
});
const GameGuessRequestSchema = v.object({
  guess: v.pipe(v.string(), v.length(5)),
});

function serializeGame(game: Game): object {
  return {
    id: game.id,
    state: game.state,
    guesses: game.guesses,
    correct: game.result.correct,
    present: game.result.present,
    absent: Array.from(game.result.absent).sort(),
  };
}

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/auth/token": {
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

    "/api/game/new": {
      async POST(req) {
        // TODO)) Actually authenticate the user
        const userId = req.headers.get("User-ID");
        if (!userId) throw new UnauthorizedError();

        // TODO)) Use a DB
        const existingGame = games.find((g) => g.userId === userId);
        if (existingGame) throw new GameAlreadyActiveError(existingGame.id);

        const game: Game = {
          id: randomUUIDv7(),
          userId,
          solution: getRandomWord(),
          state: "inProgress",
          guesses: [],
          result: {
            correct: [],
            present: [],
            absent: new Set<string>(),
          },
        };
        games.push(game);
        console.log("New game", game);

        return Response.json(serializeGame(game), { status: 201 });
      },
    },
    "/api/game/current": {
      async GET(req) {
        // TODO)) Actually authenticate the user
        const userId = req.headers.get("User-ID");
        if (!userId) throw new UnauthorizedError();

        // TODO)) Use a DB
        const game = games.find((g) => g.userId === userId);
        if (!game) throw new GameNotActiveError();

        return Response.json(serializeGame(game));
      },
    },
    "/api/game/:id/guess": {
      async POST(req) {
        const game = games.find((g) => g.id === req.params.id);
        if (!game) throw new NotFoundError();
        const { guess } = v.parse(GameGuessRequestSchema, await req.json());

        // Game is already finished -> don't accept guess
        if (game.state !== "inProgress") {
          throw new GameAlreadyFinishedError(game.id, game.state);
        }

        game.guesses.push(guess);

        // Guessed on any attempt -> game is solved
        if (guess === game.solution) game.state = "solved";
        // Did not guess on the last attempt -> game is failed
        else if (game.guesses.length === WORDLE_ATTEMPTS) game.state = "failed";

        // Validate the guess even if the game is already solved or failed
        const validationResult = mergeValidationResults(
          game.result,
          validateGuess(guess, game.solution),
        );
        game.result = validationResult;

        console.log("after guess", game.result);
        return Response.json(serializeGame(game));
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
    if (error instanceof ApiError) {
      return Response.json(error.json(), { status: error.status });
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
