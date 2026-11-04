import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { GameState } from "../state.ts";
import { Card } from "./Card.tsx";
import "./board.css";

export interface BoardHandle {
  focusTabStop(): void;
}

export interface BoardProps {
  readonly game: GameState;
  readonly onActivate: (index: number) => void;
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, onActivate }, forwardedRef) {
  const [focusIndex, setFocusIndex] = useState(0);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const size = game.board.size;

  useImperativeHandle(forwardedRef, () => ({
    focusTabStop: () => cards.current[focusIndex]?.focus(),
  }), [focusIndex]);

  const setRef = (index: number, element: HTMLButtonElement | null): void => {
    cards.current[index] = element;
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let destination = index;
    const row = Math.floor(index / size);
    const column = index % size;
    switch (event.key) {
      case "ArrowLeft": if (column > 0) destination = index - 1; break;
      case "ArrowRight": if (column < size - 1) destination = index + 1; break;
      case "ArrowUp": if (row > 0) destination = index - size; break;
      case "ArrowDown": if (row < size - 1) destination = index + size; break;
      default: return;
    }
    event.preventDefault();
    setFocusIndex(destination);
    cards.current[destination]?.focus();
  };

  const gridMinWidth = size * 44 + (size - 1) * 6;
  const gridMaxWidth = size * 88 + (size - 1) * 6;
  return (
    <div className="board-scroll" role="group" aria-label="Game board">
      <div
        className="board-grid"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))`,
          minWidth: `${gridMinWidth}px`,
          maxWidth: `${gridMaxWidth}px`,
        }}
      >
        {game.deck.map((faceId, index) => {
          const matched = game.matched.includes(index);
          const selection = game.selection;
          const revealed = selection.kind === "one" ? selection.index === index
            : selection.kind === "mismatch" ? selection.first === index || selection.second === index : false;
          return (
            <Card
              key={index}
              index={index}
              size={size}
              faceId={faceId}
              revealed={revealed}
              matched={matched}
              tabStop={index === focusIndex}
              onActivate={onActivate}
              onFocus={(event) => {
                setFocusIndex(index);
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              onKeyDown={(event) => moveFocus(event, index)}
              setRef={setRef}
            />
          );
        })}
      </div>
    </div>
  );
});
