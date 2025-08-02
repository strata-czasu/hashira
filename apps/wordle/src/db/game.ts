import type { Game, Guess } from "@prisma/client";

export type GameWithGuesses = Game & { guesses: Guess[] };
