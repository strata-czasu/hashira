import { randomInt } from "es-toolkit";

// TODO)) Get the wordlist from DB
const WORDLE_WORDS = ["fishy", "crane", "abcde", "ports", "fizzy"];
export const WORDLE_ATTEMPTS = 6;

export function getRandomWord(): string {
  // biome-ignore lint/style/noNonNullAssertion: Prototype
  return WORDLE_WORDS[randomInt(WORDLE_WORDS.length)]!;
}

export type GameState = "inProgress" | "solved" | "failed";
export type Game = {
  id: string;
  userId: string;
  solution: string;
  guesses: string[];
  state: GameState;
};

type KnownLetter = {
  letter: string;
  position: number;
};
type ValidationResult = {
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: string[];
};
export function validateGuess(guess: string, solution: string): ValidationResult {
  const correct: KnownLetter[] = [];
  const present: KnownLetter[] = [];
  const absent: string[] = [];

  let position = 0;
  for (const letter of guess.split("")) {
    if (letter === solution[position]) correct.push({ letter, position });
    else if (solution.includes(letter)) present.push({ letter, position });
    else absent.push(letter);
    position++;
  }

  return { correct, present, absent };
}
