import { isEqual, randomInt } from "es-toolkit";
import type { KnownLetter } from "./db";

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
  result: ValidationResult;
};

export type ValidationResult = {
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: Set<string>;
};
export function validateGuess(guess: string, solution: string): ValidationResult {
  const correct: KnownLetter[] = [];
  const present: KnownLetter[] = [];
  const absent = new Set<string>();

  let position = 0;
  for (const letter of guess) {
    if (letter === solution[position]) correct.push({ letter, position });
    else if (solution.includes(letter)) present.push({ letter, position });
    else absent.add(letter);
    position++;
  }

  return { correct, present, absent };
}

/**
 * Merge two ValidationResult objects, removing any duplicates
 */
export function mergeValidationResults(
  oldResult: ValidationResult,
  newResult: ValidationResult,
): ValidationResult {
  const correct = mergeKnownLetters(oldResult.correct, newResult.correct);
  const present = mergeKnownLetters(oldResult.present, newResult.present);

  const absent = oldResult.absent;
  for (const letter of newResult.absent) absent.add(letter);

  return {
    correct,
    present,
    absent,
  };
}

/**
 * Merge two arrays of KnownLetter objects without duplicates
 */
export function mergeKnownLetters(
  oldLetters: KnownLetter[],
  newLetters: KnownLetter[],
): KnownLetter[] {
  const result = oldLetters.map((l) => l);
  for (const newKnown of newLetters) {
    const existingKnown = result.find((r) => isEqual(r, newKnown));
    if (existingKnown) continue;
    result.push(newKnown);
  }
  return result;
}
