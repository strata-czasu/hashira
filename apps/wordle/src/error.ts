import type { GameState } from "./game";

export abstract class ApiError extends Error {
  abstract status: number;
  abstract json(): object;
}

export class NotFoundError extends ApiError {
  status = 404;

  json() {
    return { message: "Not found" };
  }
}

export class GameAlreadyFinishedError extends ApiError {
  status = 400;
  #gameId: string;
  #gameState: GameState;

  constructor(gameId: string, gameState: GameState) {
    super();
    this.#gameId = gameId;
    this.#gameState = gameState;
  }

  json() {
    return {
      message: "Game is already finished",
      gameId: this.#gameId,
      gameState: this.#gameState,
    };
  }
}
