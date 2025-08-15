import type { GameDetail, GuessDetail } from "@/api/types";
import { getRandomWord, validateGuess } from "@/backend/validation";
import { WORDLE_ATTEMPTS, WORDLE_WORD_LENGTH } from "@/constants";
import { type GameState, prisma } from "@/db";
import type { GameWithGuesses } from "@/db/game";
import type { BunRequest } from "bun";
import { endOfDay, startOfToday } from "date-fns";
import * as v from "valibot";
import {
  GameAlreadyActiveError,
  GameAlreadyFinishedError,
  GameNotActiveError,
  NotFoundError,
} from "./error";
import { authenticateRequest } from "./util";

const GameGuessRequestSchema = v.object({
  guess: v.pipe(v.string(), v.length(WORDLE_WORD_LENGTH)),
});

function serializeGame(game: GameWithGuesses): GameDetail {
  const guesses: GuessDetail[] = game.guesses.map((guess) => ({
    ...guess,
    absent: Array.from(new Set(guess.absent)).sort(),
  }));

  return {
    id: game.id,
    state: game.state,
    guesses,
  };
}

export const gameApi = {
  "/api/game/new": {
    async POST(req: BunRequest<"/api/game/new">): Promise<Response> {
      const { userId, guildId } = await authenticateRequest(req);

      const currentGame = await getCurrentGame(userId, guildId);
      if (currentGame) throw new GameAlreadyActiveError(currentGame.id);

      const solution = await getRandomWord(userId, guildId);
      const newGame = await prisma.game.create({
        data: {
          userId,
          guildId,
          solution,
        },
        include: { guesses: true },
      });

      return Response.json(serializeGame(newGame), { status: 201 });
    },
  },
  "/api/game/current": {
    async GET(req: BunRequest<"/api/game/current">): Promise<Response> {
      const { userId, guildId } = await authenticateRequest(req);

      const game = await getCurrentGame(userId, guildId);
      if (!game) throw new GameNotActiveError();

      return Response.json(serializeGame(game));
    },
  },
  "/api/game/:id/guess": {
    async POST(req: BunRequest<"/api/game/:id/guess">): Promise<Response> {
      const { userId, guildId } = await authenticateRequest(req);

      const { guess } = v.parse(GameGuessRequestSchema, await req.json());

      const game = await getCurrentGame(userId, guildId);
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
              correct: validatedGuess.correct,
              present: validatedGuess.present,
              absent: Array.from(validatedGuess.absent),
            },
          },
        },
        include: { guesses: true },
      });

      return Response.json(serializeGame(updatedGame));
    },
  },
};

function getCurrentGame(
  userId: string,
  guildId: string,
): Promise<GameWithGuesses | null> {
  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);

  return prisma.game.findFirst({
    where: {
      userId,
      guildId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: { guesses: true },
  });
}

/**
 * Get the new game state for the next guess based on the current game state.
 */
export function getNewGameState(game: GameWithGuesses, guess: string): GameState {
  // Guessed on any attempt -> game is solved
  if (guess === game.solution) return "solved";

  // Did not guess on the last attempt -> game is failed
  if (game.guesses.length === WORDLE_ATTEMPTS - 1) return "failed";

  // Otherwise, game is still in progress
  return game.state;
}
