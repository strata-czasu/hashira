import {
  type Game,
  WORDLE_ATTEMPTS,
  getRandomWord,
  mergeValidationResults,
  validateGuess,
} from "@/game";
import { type BunRequest, randomUUIDv7 } from "bun";
import * as v from "valibot";
import {
  GameAlreadyActiveError,
  GameAlreadyFinishedError,
  GameNotActiveError,
  NotFoundError,
  UnauthorizedError,
} from "./error";

const games: Game[] = [];
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

export const gameApi = {
  "/api/game/new": {
    async POST(req: BunRequest<"/api/game/new">): Promise<Response> {
      // TODO)) Authenticate the user
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
    async GET(req: BunRequest<"/api/game/current">): Promise<Response> {
      // TODO)) Authenticate the user
      const userId = req.headers.get("User-ID");
      if (!userId) throw new UnauthorizedError();

      // TODO)) Use a DB
      const game = games.find((g) => g.userId === userId);
      if (!game) throw new GameNotActiveError();

      return Response.json(serializeGame(game));
    },
  },
  "/api/game/:id/guess": {
    async POST(req: BunRequest<"/api/game/:id/guess">): Promise<Response> {
      // TODO)) Authenticate the user
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
};
