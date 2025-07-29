import type { GameState } from "@/game";

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

export class UnauthorizedError extends ApiError {
  status = 401;

  json() {
    return { message: "Unauthorized" };
  }
}

export class GameNotActiveError extends ApiError {
  status = 404;

  json() {
    return { message: "Game is not active" };
  }
}

export class GameAlreadyActiveError extends ApiError {
  status = 400;
  #gameId: string;

  constructor(gameId: string) {
    super();
    this.#gameId = gameId;
  }

  json() {
    return { message: "A game is already active", gameId: this.#gameId };
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
