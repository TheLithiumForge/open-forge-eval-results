import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { GameState } from "../types.ts";
import { Card } from "./Card.tsx";
import "./board.css";

export type BoardHandle = Readonly<{ focusRemembered(): void }>;
export type BoardProps = Readonly<{
  game: GameState;
  onActivate(index: number): void;
}>;

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, onActivate }, forwardedRef) {
  const size = game.board.size;
  const [tabStop, setTabStop] = useState(0);
  const cards = useRef<Array<HTMLButtonElement | null>>(
    Array.from({ length: size * size }, () => null)
  );

  useImperativeHandle(forwardedRef, () => ({
    focusRemembered() {
      cards.current[tabStop]?.focus();
    }
  }), [tabStop]);

  function moveFocus(index: number, event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let target = index;
    if (event.key === "ArrowLeft") target = index % size > 0 ? index - 1 : index;
    else if (event.key === "ArrowRight") target = index % size < size - 1 ? index + 1 : index;
    else if (event.key === "ArrowUp") target = index >= size ? index - size : index;
    else if (event.key === "ArrowDown") target = index + size < size * size ? index + size : index;
    else return;
    event.preventDefault();
    if (target !== index) cards.current[target]?.focus();
  }

  function cardFace(index: number): number | undefined {
    if (game.matched.includes(index)) return game.board.deck[index];
    if (game.selection.kind === "one" && game.selection.index === index) return game.board.deck[index];
    if (game.selection.kind === "mismatch" && (game.selection.first === index || game.selection.second === index)) {
      return game.board.deck[index];
    }
    return undefined;
  }

  const widest = size * 88 + (size - 1) * 6;
  const narrowest = size * 44 + (size - 1) * 6;

  return (
    <div className="board-scroll" aria-label={`${size} by ${size} card board`}>
      <div
        className="board-grid"
        role="group"
        aria-label={`${size} by ${size} cards`}
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
          width: `min(100%, ${widest}px)`,
          minWidth: `${narrowest}px`
        }}
      >
        {game.board.deck.map((_, index) => (
          <Card
            key={index}
            index={index}
            size={size}
            face={cardFace(index) ?? null}
            matched={game.matched.includes(index)}
            tabStop={index === tabStop}
            buttonRef={(element) => { cards.current[index] = element; }}
            onActivate={onActivate}
            onFocus={(focusedIndex) => {
              setTabStop(focusedIndex);
              cards.current[focusedIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            onKeyDown={(event) => moveFocus(index, event)}
          />
        ))}
      </div>
    </div>
  );
});
