import type { GameState } from "@/game";

type KnownLetter = { letter: string; position: number };
export type Game = {
  id: string;
  state: GameState;
  guesses: string[];
  correct: KnownLetter[];
  present: KnownLetter[];
  absent: string[];
};

function getAuthHeaders(userId: string) {
  return { "User-ID": userId };
}

/**
 * Start a new Wordle game for the given user.
 * @returns The new game object or null if a game is already active.
 */
export async function startNewGame(userId: string) {
  const res = await fetch("/api/game/new", {
    method: "POST",
    headers: getAuthHeaders(userId),
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (res.status === 400) return null;
  if (res.status !== 201) throw new Error("Failed to start new game");

  return res.json() as Promise<Game>;
}

/**
 * Get the current active game for the user.
 * @returns The current game object or null if no game is active.
 */
export async function getCurrentGame(userId: string) {
  const res = await fetch("/api/game/current", {
    headers: getAuthHeaders(userId),
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error("Failed to fetch current game");

  return res.json() as Promise<Game>;
}

export async function submitGuess(gameId: string, guess: string) {
  const res = await fetch(`/api/game/${gameId}/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess }),
  });

  if (res.status === 404) throw new Error("Game not found");
  // TODO)) Invalid guess handling
  if (res.status === 400) throw new Error("Game already finished");
  if (res.status !== 200) throw new Error("Failed to submit guess");

  return res.json() as Promise<Game>;
}
