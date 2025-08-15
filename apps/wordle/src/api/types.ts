import type { GameState, KnownLetter } from "@/db";

export type GuessDetail = {
  index: number;
  letters: string;
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: string[];
};

export type GameDetail = {
  id: number;
  state: GameState;
  guesses: GuessDetail[];
};
