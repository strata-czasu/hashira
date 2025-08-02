import { getCurrentGame, startNewGame, submitGuess } from "@/api/game";
import type { GameDetail } from "@/api/types";
import { WORDLE_ATTEMPTS, WORDLE_WORD_LENGTH } from "@/constants";
import { clsx } from "clsx";
import { isEqual } from "es-toolkit";
import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useKeyDownListener } from "./hooks/useKeyDownListener";

export function Wordle() {
  return (
    <WordleContextProvider>
      <WordleInner />
    </WordleContextProvider>
  );
}

function WordleInner() {
  const { pushGuess, pendingInput, setPendingInput } = useWordleState();

  const onKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.repeat) return;
      // TODO)) Handle game state (win/loss)

      if (e.key === "Backspace") {
        if (pendingInput.length > 0) {
          setPendingInput(pendingInput.slice(0, -1));
        }
      }
      if (e.key === "Enter") {
        if (pendingInput.length === WORDLE_WORD_LENGTH) {
          // TODO)) Validate word
          await pushGuess(pendingInput);
        }
      }

      if (!/^[a-zA-Z]$/.test(e.key)) return;
      if (pendingInput.length < WORDLE_WORD_LENGTH) {
        setPendingInput((prev) => prev + e.key.toLowerCase());
      }
    },
    [pushGuess, pendingInput, setPendingInput],
  );
  useKeyDownListener(onKeyDown);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: WORDLE_ATTEMPTS }, (_, row) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: No better alternative here
          <Row key={row} index={row} />
        ))}
      </div>
    </div>
  );
}

export default Wordle;

type RowProps = {
  index: number;
};
function Row({ index }: RowProps) {
  const { gameData, guesses, pendingInput } = useWordleState();
  const rowGuess = guesses[index];
  const isPending = index === guesses.length;

  const getLetter = (col: number): string | null => {
    if (rowGuess) return rowGuess[col] ?? null;
    if (isPending) return pendingInput[col] ?? null;
    return null;
  };

  const getState = (col: number): CellState => {
    // TODO)) Is this correct?
    if (!gameData) return "pending";
    if (isPending) return "pending";

    const guess = { letter: getLetter(col), position: col };

    const correctGuess = gameData.correct.find((c) => isEqual(c, guess));
    if (correctGuess) return "correct";

    const presentGuess = gameData.present.find((p) => isEqual(p, guess));
    if (presentGuess) return "present";

    if (rowGuess) return "absent";

    return "pending";
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length: WORDLE_WORD_LENGTH }, (_, col) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: No better alternative here
        <Cell key={`${index}:${col}`} letter={getLetter(col)} state={getState(col)} />
      ))}
    </div>
  );
}

type CellState = "correct" | "present" | "absent" | "pending";
type CellProps = {
  letter: string | null;
  state: CellState;
};
function Cell({ letter, state }: CellProps) {
  return (
    <div
      className={clsx([
        "w-20 h-20 flex items-center justify-center",
        state === "correct" && "bg-green-500",
        state === "present" && "bg-yellow-500",
        state === "absent" && "bg-gray-500",
        state === "pending" && "border-2 border-gray-500",
      ])}
    >
      {letter && <div className="text-4xl font-bold uppercase">{letter}</div>}
    </div>
  );
}

type WordleContextType = {
  // TODO)) Can we somehow ensure gameData is always not null?
  gameData: GameDetail | null;
  setGameData: Dispatch<SetStateAction<GameDetail | null>>;
  guesses: string[];
  setGuesses: Dispatch<SetStateAction<string[]>>;
  pendingInput: string;
  setPendingInput: Dispatch<SetStateAction<string>>;
};

const WordleContext = createContext<WordleContextType | undefined>(undefined);

export function WordleContextProvider({ children }: { children: React.ReactNode }) {
  const [gameData, setGameData] = useState<GameDetail | null>(null);
  // TODO)) Deduplicate this state with gameState.guesses
  const [guesses, setGuesses] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState("");

  useEffect(() => {
    if (gameData) return;

    const inner = async () => {
      // TODO)) Actual userId and guildId
      const game = await getOrCreateGame("1234", "5678");
      if (!game) throw new Error("Failed to load or start game");
      setGameData(game);
      setGuesses(game.guesses);
    };

    inner();
  }, [gameData]);

  return (
    <WordleContext.Provider
      value={{
        gameData,
        setGameData,
        guesses,
        setGuesses,
        pendingInput,
        setPendingInput,
      }}
    >
      {children}
    </WordleContext.Provider>
  );
}

export function useWordleState() {
  const context = useContext(WordleContext);
  if (!context) {
    throw new Error("useWordleContext must be used within a WordleContextProvider");
  }

  return {
    gameData: context.gameData,
    pendingInput: context.pendingInput,
    setPendingInput: context.setPendingInput,
    guesses: context.guesses,
    async pushGuess(guess: string) {
      if (!context.gameData) throw new Error("Game is not active");
      // TODO)) Don't submit when game is complete/failed

      const res = await submitGuess("1234", "5678", context.gameData.id, guess);
      context.setGameData(res);
      context.setGuesses(res.guesses);
      context.setPendingInput("");
    },
  };
}

async function getOrCreateGame(userId: string, guildId: string) {
  const activeGame = await getCurrentGame(userId, guildId);
  if (activeGame) {
    console.debug("Active game found", activeGame.id);
    return activeGame;
  }

  const newGame = await startNewGame(userId, guildId);
  if (newGame) {
    console.debug("New game started", newGame.id);
    return newGame;
  }

  return null;
}
