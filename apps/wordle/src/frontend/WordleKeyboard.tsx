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

    for (const letter of gameData.absent) {
      states.set(letter, "absent");
    }

    for (const { letter } of gameData.present) {
      states.set(letter, "present");
    }

    for (const { letter } of gameData.correct) {
      states.set(letter, "correct");
    }

    return states;
  }, [gameData]);

  const getLetterState = useCallback(
    (letter: string): CellState => {
      return letterStates.get(letter) ?? "pending";
    },
    [letterStates],
  );

  const handleLetterClick = useCallback(
    (letter: string) => {
      onLetterClick(letter);
    },
    [onLetterClick],
  );

  return (
    <div className="flex flex-col gap-2 items-center mt-4">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <KeyboardRow
          key={row.join("")}
          row={row}
          rowIndex={rowIndex}
          onLetterClick={handleLetterClick}
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
    <div className="flex gap-1">
      {rowIndex === 2 && (
        <KeyboardKey onClick={onEnter} className="px-4" state="pending">
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
        <KeyboardKey onClick={onBackspace} className="px-4" state="pending">
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
        "min-w-10 h-12 flex items-center justify-center rounded font-bold text-white transition-colors hover:opacity-80 active:scale-95",
        {
          "bg-green-500 hover:bg-green-600": state === "correct",
          "bg-yellow-500 hover:bg-yellow-600": state === "present",
          "bg-gray-500 hover:bg-gray-600": state === "absent",
          "bg-gray-600 hover:bg-gray-500": state === "pending",
        },
        className,
      ])}
    >
      {children}
    </button>
  );
});
