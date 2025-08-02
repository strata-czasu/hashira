import type { GameState, KnownLetter } from "@/db";

export type GameDetail = {
  id: number;
  state: GameState;
  guesses: string[];
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: string[];
};
