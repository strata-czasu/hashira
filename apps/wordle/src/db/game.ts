import type { ValidationResult } from "@/game";
import type { Game, Guess } from "@prisma/client";

export type GameWithGuesses = Game & { guesses: Guess[] };

export function parseValidationResult(guess: Guess): ValidationResult {
  return {
    correct: guess.correct,
    present: guess.present,
    absent: new Set(guess.absent),
  };
}
