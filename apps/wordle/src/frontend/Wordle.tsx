import { getCurrentGame, startNewGame, submitGuess } from "@/api/game";
import type { GameDetail, GuessDetail } from "@/api/types";
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
  accessToken: string;
};

export function Wordle({ userId, guildId, accessToken }: WordleProps) {
  return (
    <WordleContextProvider userId={userId} guildId={guildId} accessToken={accessToken}>
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
  const { gameData, pendingInput, setPendingInput, pushGuess, isSubmitting } =
    useWordleState();
  const { toast, showToast } = useToast();
  const [failedToCopyShareText, setFailedToCopyShareText] = useState(false);

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
    if (isSubmitting) return;
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
  }, [gameData, pendingInput, pushGuess, showToast, isSubmitting]);

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
        setFailedToCopyShareText(true);
        showToast("Nie udało się skopiować", "error");
      });
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-4 relative items-center w-full">
      {toast && <Toast toast={toast} />}
      {gameData && gameData.state !== "inProgress" && (
        <div className="space-y-2 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <div className="text-lg sm:text-xl md:text-2xl text-center">
              {gameData.state === "solved"
                ? `Gratulacje! 🎉 (${gameData.guesses.length}/${WORDLE_ATTEMPTS})`
                : "Koniec gry 😭"}
            </div>
            <button
              type="button"
              className="px-4 py-2 text-white rounded bg-green-600 hover:bg-green-700 transition-colors whitespace-nowrap"
              onClick={onShareClick}
            >
              Udostępnij
            </button>
          </div>
          {failedToCopyShareText && (
            <div className="max-w-sm mx-auto">
              <div className="text-red-500 text-sm sm:text-base">
                Nie udało się skopiować tekstu do schowka. Możesz skopiować go ręcznie:
              </div>
              <textarea
                className="resize-none w-full mt-2 text-black"
                readOnly
                rows={getShareText(gameData).split("\n").length}
                cols={16}
              >
                {getShareText(gameData)}
              </textarea>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1 sm:gap-2 items-center">
        {Array.from({ length: WORDLE_ATTEMPTS }, (_, row) => (
          <Row
            // biome-ignore lint/suspicious/noArrayIndexKey: No better alternative here
            key={row}
            index={row}
            guess={gameData?.guesses.find((g) => g.index === row) ?? null}
            isPending={gameData?.guesses.length === row}
          />
        ))}
      </div>
      <div className="w-full max-w-lg">
        <WordleKeyboard
          onLetterClick={handleLetterClick}
          onBackspace={handleBackspace}
          onEnter={handleEnter}
        />
      </div>
    </div>
  );
}

function getShareText({ guesses }: GameDetail): string {
  const lines: string[] = [`Wordle (${guesses.length}/${WORDLE_ATTEMPTS})`];

  for (const guess of guesses) {
    const line: string[] = [];
    for (const [idx, letter] of Array.from(guess.letters).entries()) {
      const isCorrect = guess.correct.some(
        (c) => c.letter === letter && c.position === idx,
      );
      if (isCorrect) {
        line.push("🟩");
        continue;
      }

      const isPresent = guess.present.some(
        (c) => c.letter === letter && c.position === idx,
      );
      if (isPresent) {
        line.push("🟨");
        continue;
      }

      line.push("⬜");
    }
    lines.push(line.join(""));
  }

  return lines.join("\n");
}

type RowProps = {
  index: number;
  guess: GuessDetail | null;
  isPending: boolean;
};
function Row({ index, guess, isPending }: RowProps) {
  const { pendingInput } = useWordleState();

  const getLetter = (col: number): string | null => {
    if (guess) return guess.letters[col] ?? null;
    if (isPending) return pendingInput[col] ?? null;
    return null;
  };

  const getState = (col: number): CellState => {
    if (!guess) return "pending";
    if (isPending) return "pending";

    const g = { letter: getLetter(col), position: col };

    const correctGuess = guess.correct.find((c) => isEqual(c, g));
    if (correctGuess) return "correct";

    const presentGuess = guess.present.find((p) => isEqual(p, g));
    if (presentGuess) return "present";

    return "absent";
  };

  return (
    <div className="flex gap-1 sm:gap-2" data-row={index}>
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
        "cell w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center select-none",
        state === "correct" && "bg-green-500",
        state === "present" && "bg-yellow-500",
        state === "absent" && "bg-gray-500",
        state === "pending" && "border-2 border-gray-500",
      ])}
    >
      {letter && (
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase">
          {letter}
        </div>
      )}
    </div>
  );
}

type WordleContextProps = {
  userId: string;
  guildId: string;
  accessToken: string;
  children: React.ReactNode;
};

type WordleContextType = {
  // TODO)) Move userId, guildId, accessToken to a separate auth context
  userId: string;
  guildId: string;
  accessToken: string;

  // TODO)) Can we somehow ensure gameData is always not null?
  gameData: GameDetail | null;
  setGameData: Dispatch<SetStateAction<GameDetail | null>>;
  pendingInput: string;
  setPendingInput: Dispatch<SetStateAction<string>>;
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
};

const WordleContext = createContext<WordleContextType | undefined>(undefined);

export function WordleContextProvider({
  userId,
  guildId,
  accessToken,
  children,
}: WordleContextProps) {
  const [gameData, setGameData] = useState<GameDetail | null>(null);
  const [pendingInput, setPendingInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gameData) return;

    const inner = async () => {
      const game = await getOrCreateGame(accessToken);
      if (!game) throw new Error("Failed to load or start game");
      setGameData(game);
    };

    inner();
  }, [gameData, accessToken]);

  return (
    <WordleContext.Provider
      value={{
        userId,
        guildId,
        accessToken,
        gameData,
        setGameData,
        pendingInput,
        setPendingInput,
        isSubmitting,
        setIsSubmitting,
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
    isSubmitting: context.isSubmitting,
    async pushGuess(guess: string) {
      if (!context.gameData) throw new Error("Game is not active");
      if (context.gameData.state !== "inProgress") {
        throw new Error("Game is not in progress");
      }

      if (context.isSubmitting) return;

      context.setIsSubmitting(true);

      try {
        const currentRow = document.querySelector(
          `[data-row="${context.gameData.guesses.length}"]`,
        );

        currentRow?.classList.add("wave");
        setTimeout(() => currentRow?.classList.remove("wave"), 700);

        const res = await submitGuess(context.accessToken, context.gameData.id, guess);
        context.setGameData(res);
        context.setPendingInput("");
      } finally {
        context.setIsSubmitting(false);
      }
    },
  };
}

async function getOrCreateGame(accessToken: string) {
  const activeGame = await getCurrentGame(accessToken);
  if (activeGame) {
    console.debug("Active game found", activeGame.id);
    return activeGame;
  }

  const newGame = await startNewGame(accessToken);
  if (newGame) {
    console.debug("New game started", newGame.id);
    return newGame;
  }

  return null;
}
