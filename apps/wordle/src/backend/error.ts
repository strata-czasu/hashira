import type { GameState } from "@/db";

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

  constructor(readonly gameId: number) {
    super();
  }

  json() {
    return { message: "A game is already active", gameId: this.gameId };
  }
}

export class GameAlreadyFinishedError extends ApiError {
  status = 400;

  constructor(
    readonly gameId: number,
    readonly gameState: GameState,
  ) {
    super();
  }

  json() {
    return {
      message: "Game is already finished",
      gameId: this.gameId,
      gameState: this.gameState,
    };
  }
}
