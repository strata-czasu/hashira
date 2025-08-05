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
import { WordleKeyboard } from "./WordleKeyboard";
import { Toast } from "./components/Toast";
import { useKeyDownListener } from "./hooks/useKeyDownListener";
import { useToast } from "./hooks/useToast";
import allWords from "./valid_words.json" with { type: "json" };

type WordleProps = {
  guildId: string;
  userId: string;
};

export function Wordle({ userId, guildId }: WordleProps) {
  return (
    <WordleContextProvider userId={userId} guildId={guildId}>
      <WordleInner />
    </WordleContextProvider>
  );
}

export default Wordle;

type ValidationResult = { isValid: true } | { isValid: false; reason: string };

function validateWord(word: string): ValidationResult {
  if (word.length !== WORDLE_WORD_LENGTH) {
    return { isValid: false, reason: "Słowo musi mieć dokładnie 6 liter" };
  }
  if (!allWords.includes(word)) {
    return { isValid: false, reason: "To słowo nie znajduje się w słowniku" };
  }

  return { isValid: true };
}

function WordleInner() {
  const { gameData, pendingInput, setPendingInput, pushGuess } = useWordleState();
  const { toast, showToast } = useToast();

  const handleLetterClick = useCallback(
    (letter: string) => {
      if (gameData?.state !== "inProgress") return;
      if (pendingInput.length < WORDLE_WORD_LENGTH) {
        setPendingInput((prev) => prev + letter.toLowerCase());
      }
    },
    [gameData, pendingInput, setPendingInput],
  );

  const handleBackspace = useCallback(() => {
    if (gameData?.state !== "inProgress") return;
    if (pendingInput.length > 0) {
      setPendingInput(pendingInput.slice(0, -1));
    }
  }, [gameData, pendingInput, setPendingInput]);

  const handleEnter = useCallback(async () => {
    if (gameData?.state !== "inProgress") return;
    const validation = validateWord(pendingInput);

    if (!validation.isValid) {
      showToast(validation.reason, "error");

      const currentRow = document.querySelector(
        `[data-row="${gameData.guesses.length}"]`,
      );

      if (currentRow) {
        currentRow.classList.add("shake");
        setTimeout(() => currentRow.classList.remove("shake"), 600);
      }

      return;
    }

    await pushGuess(pendingInput);
  }, [gameData, pendingInput, pushGuess, showToast]);

  const onKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (gameData?.state !== "inProgress") return;

      if (e.key === "Backspace") {
        handleBackspace();
      }
      if (e.key === "Enter") {
        await handleEnter();
      }

      if (!/^[a-zA-Z]$/.test(e.key)) return;
      handleLetterClick(e.key);
    },
    [gameData, handleLetterClick, handleBackspace, handleEnter],
  );
  useKeyDownListener(onKeyDown);

  const onShareClick = () => {
    if (!gameData) return;
    const shareText = getShareText(gameData);
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        showToast("Skopiowano do schowka! 📋", "success");
      })
      .catch(() => {
        showToast("Nie udało się skopiować", "error");
      });
  };

  return (
    <div className="flex flex-col gap-4 relative">
      {toast && <Toast toast={toast} />}
      {gameData?.state !== "inProgress" && (
        <div className="flex flex-row gap-6 justify-center">
          <div className="text-2xl">
            {gameData?.state === "solved"
              ? `Gratulacje! 🎉 (${gameData.guesses.length}/${WORDLE_ATTEMPTS})`
              : "Koniec gry 😭"}
          </div>
          <button
            type="button"
            className="px-4 py-2 text-white rounded bg-green-600 hover:bg-green-700 transition-colors"
            onClick={onShareClick}
          >
            Udostępnij
          </button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {Array.from({ length: WORDLE_ATTEMPTS }, (_, row) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: No better alternative here
          <Row key={row} index={row} />
        ))}
      </div>
      <WordleKeyboard
        onLetterClick={handleLetterClick}
        onBackspace={handleBackspace}
        onEnter={handleEnter}
      />
    </div>
  );
}

function getShareText({ guesses, correct, present, absent }: GameDetail): string {
  const lines: string[] = [`Wordle (${guesses.length}/${WORDLE_ATTEMPTS})`];

  for (const guess of guesses) {
    const line: string[] = [];
    for (const [idx, letter] of Array.from(guess).entries()) {
      const isCorrect = correct.some((c) => c.letter === letter && c.position === idx);
      if (isCorrect) {
        line.push("🟩");
        continue;
      }

      const isPresent = present.some((c) => c.letter === letter && c.position === idx);
      if (isPresent) {
        line.push("🟨");
        continue;
      }

      line.push("⬜");
    }
    guesses.push(line.join(""));
  }

  return lines.join("\n");
}

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
    <div className="flex gap-2" data-row={index}>
      {Array.from({ length: WORDLE_WORD_LENGTH }, (_, col) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: No better alternative here
        <Cell key={`${index}:${col}`} letter={getLetter(col)} state={getState(col)} />
      ))}
    </div>
  );
}

export type CellState = "correct" | "present" | "absent" | "pending";
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

type WordleContextProps = {
  userId: string;
  guildId: string;
  children: React.ReactNode;
};

type WordleContextType = {
  userId: string;
  guildId: string;
  // TODO)) Can we somehow ensure gameData is always not null?
  gameData: GameDetail | null;
  setGameData: Dispatch<SetStateAction<GameDetail | null>>;
  guesses: string[];
  setGuesses: Dispatch<SetStateAction<string[]>>;
  pendingInput: string;
  setPendingInput: Dispatch<SetStateAction<string>>;
};

const WordleContext = createContext<WordleContextType | undefined>(undefined);

export function WordleContextProvider({
  userId,
  guildId,
  children,
}: WordleContextProps) {
  const [gameData, setGameData] = useState<GameDetail | null>(null);
  // TODO)) Deduplicate this state with gameData.guesses
  const [guesses, setGuesses] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState("");

  useEffect(() => {
    if (gameData) return;

    const inner = async () => {
      const game = await getOrCreateGame(userId, guildId);
      if (!game) throw new Error("Failed to load or start game");
      setGameData(game);
      setGuesses(game.guesses);
    };

    inner();
  }, [gameData, userId, guildId]);

  return (
    <WordleContext.Provider
      value={{
        userId,
        guildId,
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
      if (context.gameData.state !== "inProgress") {
        throw new Error("Game is not in progress");
      }

      const res = await submitGuess(
        context.userId,
        context.guildId,
        context.gameData.id,
        guess,
      );
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
