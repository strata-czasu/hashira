import { describe, expect, test } from "bun:test";
import { mergeKnownLetters, mergeValidationResults, validateGuess } from "./validation";

describe("validateGuess", () => {
  test("absent letters", () => {
    const { absent } = validateGuess("fishy", "dizzy");
    expect(absent).toContain("f");
    expect(absent).toContain("s");
  });
  test("present letters", () => {
    const { present } = validateGuess("tests", "stray");
    expect(present).toContainEqual({ letter: "t", position: 0 });
    expect(present).toContainEqual({ letter: "s", position: 2 });
    expect(present).toContainEqual({ letter: "t", position: 3 });
    expect(present).toContainEqual({ letter: "s", position: 4 });
  });
  test("correct letters", () => {
    const { correct } = validateGuess("fishy", "fizzy");
    expect(correct).toContainEqual({ letter: "f", position: 0 });
    expect(correct).toContainEqual({ letter: "i", position: 1 });
    expect(correct).toContainEqual({ letter: "y", position: 4 });
  });
  test("present letters already in correct", () => {
    const { correct, present, absent } = validateGuess("grader", "graves");

    expect(correct).toHaveLength(4);
    expect(correct).toContainEqual({ letter: "g", position: 0 });
    expect(correct).toContainEqual({ letter: "r", position: 1 });
    expect(correct).toContainEqual({ letter: "a", position: 2 });
    expect(correct).toContainEqual({ letter: "e", position: 4 });

    expect(present).toHaveLength(0);

    expect(absent).toHaveLength(1);
    expect(absent).toContain("d");
  });
});

describe("mergeKnownLetters", () => {
  test("empty arrays", () => {
    const result = mergeKnownLetters([], []);
    expect(result).toEqual([]);
  });
  test("unique items", () => {
    const result = mergeKnownLetters(
      [{ letter: "a", position: 0 }],
      [
        { letter: "b", position: 0 },
        { letter: "c", position: 1 },
      ],
    );
    expect(result.length).toBe(3);
  });
  test("duplicate items", () => {
    const result = mergeKnownLetters(
      [{ letter: "a", position: 0 }],
      [
        { letter: "a", position: 0 },
        { letter: "b", position: 1 },
      ],
    );
    expect(result.length).toBe(2);
  });
});

describe("mergeValidationResults", () => {
  test("absent letters", () => {
    const result = mergeValidationResults(
      {
        correct: [],
        present: [],
        absent: new Set(["a", "b", "c", "d", "e"]),
      },
      {
        correct: [],
        present: [],
        absent: new Set(["a", "b", "f", "g", "h"]),
      },
    );
    const expected = new Set<string>(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(result.absent).toEqual(expected);
  });
  test("present letters", () => {
    const result = mergeValidationResults(
      {
        correct: [],
        present: [
          { letter: "a", position: 0 },
          { letter: "b", position: 1 },
        ],
        absent: new Set(),
      },
      {
        correct: [],
        present: [
          { letter: "a", position: 2 },
          { letter: "d", position: 3 },
        ],
        absent: new Set(),
      },
    );
    expect(result.present.length).toEqual(4);
    expect(result.present).toContainEqual({ letter: "a", position: 0 });
    expect(result.present).toContainEqual({ letter: "b", position: 1 });
    expect(result.present).toContainEqual({ letter: "a", position: 2 });
    expect(result.present).toContainEqual({ letter: "d", position: 3 });
  });
  test("correct letters", () => {
    const result = mergeValidationResults(
      {
        correct: [
          { letter: "a", position: 0 },
          { letter: "b", position: 1 },
        ],
        present: [],
        absent: new Set(),
      },
      {
        correct: [
          { letter: "a", position: 2 },
          { letter: "d", position: 3 },
        ],
        present: [],
        absent: new Set(),
      },
    );
    expect(result.correct.length).toEqual(4);
    expect(result.correct).toContainEqual({ letter: "a", position: 0 });
    expect(result.correct).toContainEqual({ letter: "b", position: 1 });
    expect(result.correct).toContainEqual({ letter: "a", position: 2 });
    expect(result.correct).toContainEqual({ letter: "d", position: 3 });
  });
});
