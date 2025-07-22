import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useKeyDownListener } from "./hooks/useKeyDownListener";

const ATTEMPTS = 6;
const WORD_LENGTH = 5;

export function Wordle() {
  return (
    <WorldeContextProvider>
      <WordleInner />
    </WorldeContextProvider>
  );
}

function WordleInner() {
  const { pushGuess, pendingInput, setPendingInput, resetGame } = useWordleState();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) return;
      // TODO)) Handle game state (win/loss)

      if (e.key === "Backspace") {
        if (pendingInput.length > 0) {
          setPendingInput(pendingInput.slice(0, -1));
        }
      }
      if (e.key === "Enter") {
        if (pendingInput.length === WORD_LENGTH) {
          // TODO)) Validate word
          pushGuess(pendingInput);
        }
      }

      if (!/^[a-zA-Z]$/.test(e.key)) return;
      if (pendingInput.length < WORD_LENGTH) {
        setPendingInput((prev) => prev + e.key.toUpperCase());
      }
    },
    [pushGuess, pendingInput, setPendingInput],
  );
  useKeyDownListener(onKeyDown);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: ATTEMPTS }, (_, row) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: No better alternative here
          <Row key={row} index={row} />
        ))}
      </div>

      <div>
        <button
          type="button"
          className="px-4 py-2 my-4 text-white rounded bg-red-400 hover:bg-red-500 transition-colors"
          onClick={resetGame}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default Wordle;

type RowProps = {
  index: number;
};
function Row({ index }: RowProps) {
  const { guesses, pendingInput } = useWordleState();
  const rowGuess = guesses[index];
  const isPending = index === guesses.length;

  const getLetter = (col: number) => {
    if (rowGuess) return rowGuess[col] ?? null;
    if (isPending) return pendingInput[col] ?? null;
    return null;
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length: WORD_LENGTH }, (_, col) => (
        <Cell key={(index + 1) * (col + 1)} letter={getLetter(col)} />
      ))}
    </div>
  );
}

type CellProps = {
  letter: string | null;
};
function Cell({ letter }: CellProps) {
  return (
    <div className="w-20 h-20 border border-gray-300 flex items-center justify-center">
      {letter && <div className="text-4xl font-bold">{letter}</div>}
    </div>
  );
}

type WordleContextType = {
  guesses: string[];
  setGuesses: Dispatch<SetStateAction<string[]>>;
  pendingInput: string;
  setPendingInput: Dispatch<SetStateAction<string>>;
};

const WorldeContext = createContext<WordleContextType | undefined>(undefined);

function WorldeContextProvider({ children }: { children: React.ReactNode }) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState("");

  return (
    <WorldeContext.Provider
      value={{
        guesses,
        setGuesses,
        pendingInput,
        setPendingInput,
      }}
    >
      {children}
    </WorldeContext.Provider>
  );
}

function useWordleState() {
  const context = useContext(WorldeContext);
  if (!context) {
    throw new Error("useWordleContext must be used within a WorldeContextProvider");
  }

  return {
    pendingInput: context.pendingInput,
    setPendingInput: context.setPendingInput,
    guesses: context.guesses,
    pushGuess(guess: string) {
      context.setGuesses((prev) => [...prev, guess]);
      context.setPendingInput("");
    },
    resetGame() {
      context.setGuesses([]);
      context.setPendingInput("");
    },
  };
}
