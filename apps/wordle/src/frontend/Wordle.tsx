import { clsx } from "clsx";
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
    <WordleContextProvider>
      <WordleInner />
    </WordleContextProvider>
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
        setPendingInput((prev) => prev + e.key.toLowerCase());
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

  const getLetter = (col: number): string | null => {
    if (rowGuess) return rowGuess[col] ?? null;
    if (isPending) return pendingInput[col] ?? null;
    return null;
  };

  const getState = (col: number): CellState => {
    // TODO)) Actually check the word against the solution
    if (rowGuess) return "absent";
    return "pending";
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length: WORD_LENGTH }, (_, col) => (
        <Cell
          key={(index + 1) * (col + 1)}
          letter={getLetter(col)}
          state={getState(col)}
        />
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
  guesses: string[];
  setGuesses: Dispatch<SetStateAction<string[]>>;
  pendingInput: string;
  setPendingInput: Dispatch<SetStateAction<string>>;
};

const WordleContext = createContext<WordleContextType | undefined>(undefined);

function WordleContextProvider({ children }: { children: React.ReactNode }) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState("");

  return (
    <WordleContext.Provider
      value={{
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

function useWordleState() {
  const context = useContext(WordleContext);
  if (!context) {
    throw new Error("useWordleContext must be used within a WordleContextProvider");
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
