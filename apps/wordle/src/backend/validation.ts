import { isEqual, sample } from "es-toolkit";
import { type Guess, type KnownLetter, prisma } from "../db";

export async function getRandomWord(guildId: string): Promise<string> {
  const availableWords = await prisma.availableWord.findMany({
    where: { guildId },
  });
  if (availableWords.length === 0) {
    throw new Error("No words available for this guild");
  }
  // TODO)) Pick a word that a given user has not guessed yet
  return sample(availableWords.map((aw) => aw.word));
}

export type ValidationResult = {
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: Set<string>;
};

/**
 * Transform a Guess object into a ValidationResult
 */
export function parseValidationResult(guess: Guess): ValidationResult {
  return {
    correct: guess.correct,
    present: guess.present,
    absent: new Set(guess.absent),
  };
}

/**
 * Validate a wordle guess against the solution
 */
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
