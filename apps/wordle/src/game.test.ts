import { describe, expect, test } from "bun:test";
import { validateGuess } from "./game";

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
});
