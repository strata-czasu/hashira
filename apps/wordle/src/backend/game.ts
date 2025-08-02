import type { GameDetail } from "@/api/types";
import {
  type KnownLetter,
  WORDLE_ATTEMPTS,
  getRandomWord,
  validateGuess,
} from "@/game";
import type { BunRequest } from "bun";
import { type Game, type GameState, type Guess, prisma } from "db";
import * as v from "valibot";
import {
  GameAlreadyActiveError,
  GameAlreadyFinishedError,
  GameNotActiveError,
  NotFoundError,
  UnauthorizedError,
} from "./error";

const GameGuessRequestSchema = v.object({
  guess: v.pipe(v.string(), v.length(5)),
});

type GameWithGuesses = Game & { guesses: Guess[] };

function serializeGame(game: GameWithGuesses): GameDetail {
  return {
    id: game.id,
    state: game.state,
    guesses: game.guesses.map((g) => g.letters),
    // TODO)) Validate schema in a common place
    // TODO)) Merge all game results before returning
    correct: game.guesses.flatMap((g) => g.correct as KnownLetter[]),
    present: game.guesses.flatMap((g) => g.present as KnownLetter[]),
    absent: Array.from(
      new Set(game.guesses.flatMap((g) => g.absent as string[])),
    ).sort(),
  };
}

function getAuthHeaders(req: BunRequest): { userId: string; guildId: string } {
  const userId = req.headers.get("User-ID");
  const guildId = req.headers.get("Guild-ID");
  // TODO)) Authenticate the user
  if (!userId || !guildId) throw new UnauthorizedError();
  return { userId, guildId };
}

export const gameApi = {
  "/api/game/new": {
    async POST(req: BunRequest<"/api/game/new">): Promise<Response> {
      const { userId, guildId } = getAuthHeaders(req);

      const existingGame = await prisma.game.findFirst({
        where: { userId, guildId },
        select: { id: true },
      });
      if (existingGame) throw new GameAlreadyActiveError(existingGame.id);

      const solution = getRandomWord();
      const newGame = await prisma.game.create({
        data: {
          userId,
          guildId,
          solution,
        },
        include: { guesses: true },
      });
      console.log("New game", newGame);

      return Response.json(serializeGame(newGame), { status: 201 });
    },
  },
  "/api/game/current": {
    async GET(req: BunRequest<"/api/game/current">): Promise<Response> {
      const { userId, guildId } = getAuthHeaders(req);

      const game = await prisma.game.findFirst({
        where: { userId, guildId },
        include: { guesses: true },
      });
      if (!game) throw new GameNotActiveError();

      return Response.json(serializeGame(game));
    },
  },
  "/api/game/:id/guess": {
    async POST(req: BunRequest<"/api/game/:id/guess">): Promise<Response> {
      const { userId, guildId } = getAuthHeaders(req);

      const { guess } = v.parse(GameGuessRequestSchema, await req.json());

      const game = await prisma.game.findFirst({
        where: { id: Number.parseInt(req.params.id), userId, guildId },
        include: { guesses: true },
      });
      if (!game) throw new NotFoundError();

      // Game is already finished -> don't accept guess
      if (game.state !== "inProgress") {
        throw new GameAlreadyFinishedError(game.id, game.state);
      }

      const validatedGuess = validateGuess(guess, game.solution);

      const updatedGame = await prisma.game.update({
        where: { id: game.id },
        data: {
          state: getNewGameState(game, guess),
          guesses: {
            create: {
              index: game.guesses.length,
              letters: guess,
              // TODO)) Validate the shape of this data before saving
              correct: validatedGuess.correct,
              present: validatedGuess.present,
              absent: Array.from(validatedGuess.absent),
            },
          },
        },
        include: { guesses: true },
      });

      console.log("after guess", game);
      return Response.json(serializeGame(updatedGame));
    },
  },
};

function getNewGameState(game: GameWithGuesses, guess: string): GameState {
  // Guessed on any attempt -> game is solved
  if (guess === game.solution) return "solved";

  // Did not guess on the last attempt -> game is failed
  if (game.guesses.length === WORDLE_ATTEMPTS) return "failed";

  // Otherwise, game is still in progress
  return game.state;
}
