import { clsx } from "clsx";
import React, { useCallback, useMemo } from "react";
import { type CellState, useWordleState } from "./Wordle";

type WordleKeyboardProps = {
  onLetterClick: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
] as const;

export function WordleKeyboard({
  onLetterClick,
  onBackspace,
  onEnter,
}: WordleKeyboardProps) {
  const { gameData } = useWordleState();

  const letterStates = useMemo(() => {
    if (!gameData) return new Map<string, CellState>();

    const states = new Map<string, CellState>();

    for (const guess of gameData.guesses) {
      for (const letter of guess.absent) {
        states.set(letter, "absent");
      }

      for (const { letter } of guess.present) {
        states.set(letter, "present");
      }

      for (const { letter } of guess.correct) {
        states.set(letter, "correct");
      }
    }

    return states;
  }, [gameData]);

  const getLetterState = useCallback(
    (letter: string): CellState => {
      return letterStates.get(letter) ?? "pending";
    },
    [letterStates],
  );

  return (
    <div className="flex flex-col gap-1 sm:gap-2 items-center mt-4 w-full">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <KeyboardRow
          key={row.join("")}
          row={row}
          rowIndex={rowIndex}
          onLetterClick={onLetterClick}
          onBackspace={onBackspace}
          onEnter={onEnter}
          getLetterState={getLetterState}
        />
      ))}
    </div>
  );
}

type KeyboardRowProps = {
  row: readonly string[];
  rowIndex: number;
  onLetterClick: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  getLetterState: (letter: string) => CellState;
};

function KeyboardRow({
  row,
  rowIndex,
  onLetterClick,
  onBackspace,
  onEnter,
  getLetterState,
}: KeyboardRowProps) {
  return (
    <div className="flex gap-0.5 sm:gap-1 justify-center w-full">
      {rowIndex === 2 && (
        <KeyboardKey onClick={onEnter} className="px-2 sm:px-4 text-xs" state="pending">
          ENTER
        </KeyboardKey>
      )}
      {row.map((letter) => (
        <KeyboardKey
          key={letter}
          onClick={() => onLetterClick(letter)}
          state={getLetterState(letter)}
        >
          {letter.toUpperCase()}
        </KeyboardKey>
      ))}
      {rowIndex === 2 && (
        <KeyboardKey onClick={onBackspace} className="px-2 sm:px-4" state="pending">
          ⌫
        </KeyboardKey>
      )}
    </div>
  );
}

type KeyboardKeyProps = {
  children: React.ReactNode;
  onClick: () => void;
  state: CellState;
  className?: string;
};

const KeyboardKey = React.memo(function KeyboardKey({
  children,
  onClick,
  state,
  className,
}: KeyboardKeyProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx([
        "min-w-9 sm:min-w-10 h-11 sm:h-12 flex items-center justify-center rounded font-bold text-white transition-colors hover:opacity-70 active:scale-95 text-xs sm:text-sm",
        {
          "bg-green-500": state === "correct",
          "bg-yellow-500": state === "present",
          "bg-gray-500": state === "absent",
          "bg-gray-700": state === "pending",
        },
        className,
      ])}
    >
      {children}
    </button>
  );
});
