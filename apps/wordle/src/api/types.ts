import type { KnownLetter } from "@/game";
import type { GameState } from "db";

export type GameDetail = {
  id: number;
  state: GameState;
  guesses: string[];
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: string[];
};
