import { endOfDay, startOfToday } from "date-fns";
import { isEqual } from "es-toolkit";
import { type Guess, type KnownLetter, prisma } from "../db";

export async function getRandomWord(userId: string, guildId: string): Promise<string> {
  const previouslyUsedWords = await prisma.game.findMany({
    where: { userId, guildId },
    select: { solution: true },
    distinct: ["solution"],
  });

  const availableWords = await prisma.availableWord.findMany({
    where: {
      guildId,
      word: { notIn: previouslyUsedWords.map((game) => game.solution) },
    },
  });

  if (availableWords.length === 0) {
    throw new Error("No words available for this guild");
  }

  const todayStart = startOfToday();
  const todayEnd = endOfDay(todayStart);

  const solutionCounts = await prisma.game.groupBy({
    by: ["solution"],
    where: {
      guildId,
      createdAt: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    _count: {
      solution: true,
    },
    orderBy: {
      _count: { solution: "desc" },
    },
  });

  const weightedWords: { word: string; weight: number }[] = [];
  for (const availableWord of availableWords) {
    const solutionCount = solutionCounts.find(
      (sc) => sc.solution === availableWord.word,
    );

    const count = solutionCount?._count.solution || 0;
    const weight = 1 / (count + 1);

    weightedWords.push({ word: availableWord.word, weight });
  }

  return weightedRandomSelect(weightedWords);
}

function weightedRandomSelect(
  weightedWords: { word: string; weight: number }[],
): string {
  if (weightedWords.length === 0) {
    throw new Error("No words available for selection");
  }

  const totalWeight = weightedWords.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weightedWords) {
    random -= item.weight;
    if (random <= 0) {
      return item.word;
    }
  }

  const lastWord = weightedWords[weightedWords.length - 1];

  if (!lastWord) {
    throw new Error("No words available for selection");
  }

  return lastWord.word;
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

export function countLetters(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const letter of word) {
    counts.set(letter, (counts.get(letter) || 0) + 1);
  }
  return counts;
}

/**
 * Validate a wordle guess against the solution
 */
export function validateGuess(guess: string, solution: string): ValidationResult {
  const lettersToGuess = countLetters(solution);
  const correct: KnownLetter[] = [];
  const present: KnownLetter[] = [];
  const absent = new Set<string>();

  for (const [position, letter] of Array.from(guess).entries()) {
    if (letter === solution[position]) {
      correct.push({ letter, position });
      lettersToGuess.set(letter, (lettersToGuess.get(letter) || 0) - 1);
    } else if (!solution.includes(letter)) {
      absent.add(letter);
    }
  }

  for (const [position, letter] of Array.from(guess).entries()) {
    if (!solution.includes(letter)) continue;
    // Letter already has all correct positions guessed
    if ((lettersToGuess.get(letter) || 0) <= 0) continue;
    present.push({ letter, position });
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
