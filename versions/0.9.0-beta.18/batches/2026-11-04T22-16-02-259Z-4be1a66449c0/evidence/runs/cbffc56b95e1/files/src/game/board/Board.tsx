import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Face, ClosedFace, faceName } from "../art/Face";
import { revealedIndices, type GameState } from "../game";

export interface BoardHandle { focusRemembered(): void; }
interface BoardProps {
  readonly game: GameState;
  readonly dealVersion: number;
  readonly onActivate: (index: number) => void;
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, dealVersion, onActivate }, ref) {
  const [remembered, setRemembered] = useState(0);
  const rememberedRef = useRef(0);
  const [cardSize, setCardSize] = useState(44);
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const visible = revealedIndices(game);

  useImperativeHandle(ref, () => ({
    focusRemembered: () => buttonsRef.current[rememberedRef.current]?.focus(),
  }), []);

  useLayoutEffect(() => {
    rememberedRef.current = 0;
    setRemembered(0);
  }, [dealVersion]);

  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (area === null) return;
    const updateSize = () => {
      const gaps = (game.board.size - 1) * 6;
      const available = area.clientWidth - 12;
      const size = Math.max(44, Math.min(88, (available - gaps) / game.board.size));
      setCardSize(size);
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(area);
    updateSize();
    return () => observer.disconnect();
  }, [game.board.size]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const side = game.board.size;
    let next: number;
    switch (event.key) {
      case "ArrowLeft": next = index % side > 0 ? index - 1 : index; break;
      case "ArrowRight": next = index % side < side - 1 ? index + 1 : index; break;
      case "ArrowUp": next = index >= side ? index - side : index; break;
      case "ArrowDown": next = index < side * (side - 1) ? index + side : index; break;
      default: return;
    }
    event.preventDefault();
    if (next !== index) buttonsRef.current[next]?.focus();
  };

  return (
    <div className="board-scroll" ref={scrollRef}>
      <div className="board-grid" role="group" aria-label={`${game.board.size} by ${game.board.size} game board`} style={{ gridTemplateColumns: `repeat(${game.board.size}, ${cardSize}px)` }}>
        {game.deck.map((faceId, index) => {
          const matched = game.matched.has(index);
          const isVisible = matched || visible.has(index);
          const row = Math.floor(index / game.board.size) + 1;
          const column = index % game.board.size + 1;
          const name = isVisible
            ? `Row ${row}, column ${column}, ${faceName(faceId)}, ${matched ? "matched" : "revealed"}`
            : `Row ${row}, column ${column}, closed`;
          return (
            <button
              key={index}
              ref={(node) => { buttonsRef.current[index] = node; }}
              className={`game-card${matched ? " matched" : ""}${isVisible ? " revealed" : ""}`}
              type="button"
              aria-label={name}
              aria-disabled={matched ? "true" : undefined}
              tabIndex={remembered === index ? 0 : -1}
              onClick={() => onActivate(index)}
              onKeyDown={(event) => moveFocus(event, index)}
              onFocus={() => {
                rememberedRef.current = index;
                setRemembered(index);
                eventScrollIntoView(buttonsRef.current[index]);
              }}
            >
              {isVisible ? <Face faceId={faceId} /> : <ClosedFace />}
              {matched && <span className="matched-check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
});

function eventScrollIntoView(button: HTMLButtonElement | null | undefined): void {
  button?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
