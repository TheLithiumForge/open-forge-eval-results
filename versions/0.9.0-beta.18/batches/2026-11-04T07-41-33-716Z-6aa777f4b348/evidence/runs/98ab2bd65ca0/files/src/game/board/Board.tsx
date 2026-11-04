import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import type { GameState } from "../state.ts";
import { Card } from "./Card.tsx";
import "./Board.css";

export interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
}

export interface BoardHandle {
  focusRememberedCard(): void;
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board(
  { game, paused, onActivate },
  ref,
) {
  const rememberedIndex = useRef(0);
  const [tabStop, setTabStop] = useState(0);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const size = game.board.size;
  const count = game.board.deck.length;
  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))`,
    minWidth: `${size * 44 + (size - 1) * 6}px`,
    maxWidth: `${size * 88 + (size - 1) * 6}px`,
  };

  useImperativeHandle(ref, () => ({
    focusRememberedCard: () => {
      const target = cardRefs.current[rememberedIndex.current] ?? cardRefs.current[0];
      target?.focus();
    },
  }), []);

  function moveFocus(index: number): void {
    cardRefs.current[index]?.focus();
  }

  function rememberFocus(index: number): void {
    rememberedIndex.current = index;
    setTabStop(index);
    cardRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div className="board-scroll">
      <div className="board-grid" aria-label={`Card board, ${size} by ${size}`} role="group" style={style}>
        {Array.from({ length: count }, (_, index) => (
          <Card
            key={index}
            ref={(node) => { if (node !== null) cardRefs.current[index] = node; }}
            game={game}
            index={index}
            onActivate={onActivate}
            onFocusCard={rememberFocus}
            onMoveFocus={moveFocus}
            paused={paused}
            tabStop={index === tabStop}
          />
        ))}
      </div>
    </div>
  );
});
