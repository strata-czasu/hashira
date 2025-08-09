import { describe, expect, test } from "bun:test";
import { WORDLE_ATTEMPTS } from "@/constants";
import type { GameWithGuesses } from "@/db/game";
import { getNewGameState } from "./game";

describe("getNewGameState", () => {
  test("should return 'solved' if the guess matches the solution", () => {
    const game = {
      solution: "apples",
      guesses: [],
      state: "inProgress",
    } as unknown as GameWithGuesses;

    const newState = getNewGameState(game, "apples");
    expect(newState).toBe("solved");
  });

  test("should return 'failed' if the maximum number of guesses is reached", () => {
    const game = {
      solution: "apples",
      guesses: Array.from({ length: WORDLE_ATTEMPTS - 1 }, () => "random"),
      state: "inProgress",
    } as unknown as GameWithGuesses;

    const newState = getNewGameState(game, "random");
    expect(newState).toBe("failed");
  });

  test("should return 'inProgress' if the game is still ongoing", () => {
    const game = {
      solution: "apples",
      guesses: ["apples", "banana"],
      state: "inProgress",
    } as unknown as GameWithGuesses;

    const newState = getNewGameState(game, "orange");
    expect(newState).toBe("inProgress");
  });
});
