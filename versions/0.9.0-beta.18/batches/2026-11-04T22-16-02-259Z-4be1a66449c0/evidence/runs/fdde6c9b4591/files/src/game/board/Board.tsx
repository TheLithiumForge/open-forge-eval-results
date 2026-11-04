import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { GameState } from "../model.ts";
import { isWon } from "../turns.ts";
import { Face } from "./Face.tsx";
import { faceDefinition } from "./faces.ts";
import "./Board.css";

export type BoardHandle = Readonly<{ focusRememberedCard: () => void }>;
type BoardProps = Readonly<{
  game: GameState;
  resetKey: number;
  paused: boolean;
  onActivate: (index: number) => void;
}>;

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, resetKey, paused, onActivate }, ref) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rememberedRef = useRef(0);
  const [tabStop, setTabStop] = useState(0);
  const [cardSize, setCardSize] = useState(88);
  const side = game.board.side;
  const matched = new Set(game.matched);

  useImperativeHandle(ref, () => ({
    focusRememberedCard: () => cardRefs.current[rememberedRef.current]?.focus(),
  }), []);

  useEffect(() => {
    rememberedRef.current = 0;
    setTabStop(0);
  }, [resetKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateSize = (width: number) => {
      const available = Math.max(0, width - (side - 1) * 6);
      const next = Math.max(44, Math.min(88, available / side));
      setCardSize((current) => Math.abs(current - next) < 0.5 ? current : next);
    };
    updateSize(viewport.clientWidth - 12);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) updateSize(entry.contentRect.width);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [side]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const moves: Readonly<Record<string, number>> = {
      ArrowLeft: index % side === 0 ? index : index - 1,
      ArrowRight: index % side === side - 1 ? index : index + 1,
      ArrowUp: index < side ? index : index - side,
      ArrowDown: index >= side * (side - 1) ? index : index + side,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    if (target === index) return;
    rememberedRef.current = target;
    setTabStop(target);
    cardRefs.current[target]?.focus();
  };

  const gridStyle = { "--side": side, "--card-size": `${cardSize}px` } as CSSProperties;
  const mismatch = game.selection.kind === "mismatch";
  const rows = Array.from({ length: side }, (_, row) => row);
  return (
    <div className="board-scroll" ref={viewportRef} role="grid" aria-label="Game board" aria-rowcount={side} aria-colcount={side}>
      <div className="board-grid" style={gridStyle}>
        {rows.map((row) => (
          <div className="board-row" role="row" aria-rowindex={row + 1} key={row}>
            {Array.from({ length: side }, (_, column) => {
              const index = row * side + column;
              const isMatched = matched.has(index);
              const revealed = isMatched || game.selection.kind === "one" && game.selection.index === index ||
                mismatch && (game.selection.first === index || game.selection.second === index);
              const faceId = revealed ? game.board.deck[index]! : null;
              const name = faceId === null
                ? `Row ${row + 1}, column ${column + 1}, closed`
                : `Row ${row + 1}, column ${column + 1}, ${faceDefinition(faceId).name}, ${isMatched ? "matched" : "revealed"}`;
              return (
                <div role="gridcell" aria-colindex={column + 1} key={index}>
                  <button
                    className={`game-card${isMatched ? " is-matched" : ""}`}
                    type="button"
                    aria-label={name}
                    aria-disabled={isMatched || mismatch || paused || undefined}
                    tabIndex={tabStop === index ? 0 : -1}
                    onFocus={() => {
                      rememberedRef.current = index;
                      setTabStop(index);
                      cardRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
                    }}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    onClick={() => onActivate(index)}
                    ref={(element) => { cardRefs.current[index] = element; }}
                    style={{ "--card-size": `${cardSize}px` } as CSSProperties}
                  >
                    {faceId === null ? (
                      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                        <polygon points="50,27 73,50 50,73 27,50" fill="none" stroke="#757C9A" strokeWidth="5" />
                      </svg>
                    ) : <Face id={faceId} />}
                    {isMatched && <span className="match-check" aria-hidden="true">✓</span>}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export function BoardSummary({ game }: Readonly<{ game: GameState }>) {
  const pairs = game.matched.length / 2;
  return <span className="visually-hidden">{isWon(game) ? "Game complete." : `${pairs} pairs found.`}</span>;
}
