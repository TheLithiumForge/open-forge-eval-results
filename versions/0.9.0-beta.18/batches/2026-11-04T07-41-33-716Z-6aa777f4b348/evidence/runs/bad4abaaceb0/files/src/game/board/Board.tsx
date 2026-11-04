import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { KeyboardEvent } from "react";
import { SELECTION_KIND } from "../constants.ts";
import { isWon } from "../transition.ts";
import type { GameState } from "../state.ts";
import { CardBack, FaceArtwork, faceName } from "./Artwork.tsx";
import "./Board.css";

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type Props = Readonly<{ game: GameState; paused: boolean; onActivate: (index: number) => void }>;

export const Board = forwardRef<BoardHandle, Props>(function Board({ game, paused, onActivate }, ref) {
  const [focused, setFocused] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const suppressedKeyboardClick = useRef(false);
  const columns = game.board.size;
  const gridStyle: CSSProperties & { "--columns": number; "--card-size": string } = {
    "--columns": columns,
    "--card-size": `clamp(44px, calc((100cqw - ${(columns - 1) * 6}px) / ${columns}), 88px)`,
  };
  const shown = (index: number): boolean => game.matched.includes(index)
    || game.selection.kind === SELECTION_KIND.one && game.selection.index === index
    || game.selection.kind === SELECTION_KIND.mismatch && (game.selection.first === index || game.selection.second === index);

  function focusCard(index: number): void {
    setFocused(index);
    const button = buttons.current.get(index);
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  useImperativeHandle(ref, () => ({ focusRemembered: () => focusCard(focused) }), [focused]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if ((event.key === "Enter" || event.key === " ") && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) {
      suppressedKeyboardClick.current = true;
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(index / columns);
    const column = index % columns;
    const target = event.key === "ArrowLeft" && column > 0 ? index - 1
      : event.key === "ArrowRight" && column < columns - 1 ? index + 1
        : event.key === "ArrowUp" && row > 0 ? index - columns
          : event.key === "ArrowDown" && row < columns - 1 ? index + columns
            : null;
    if (target !== null) {
      event.preventDefault();
      focusCard(target);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
    }
  }

  const total = columns * columns;
  return (
    <div className="board-scroll" role="group" aria-label="Memory game board">
      <div className="board-grid" style={gridStyle}>
        {Array.from({ length: total }, (_, index) => {
          const faceShown = shown(index);
          const matched = game.matched.includes(index);
          const face = faceShown ? game.deck[index] : undefined;
          const row = Math.floor(index / columns) + 1;
          const column = index % columns + 1;
          const label = face === undefined ? `Row ${row}, column ${column}, closed`
            : `Row ${row}, column ${column}, ${faceName(face)}, ${matched ? "matched" : "revealed"}`;
          return (
            <button
              key={index}
              ref={(node) => { if (node) buttons.current.set(index, node); else buttons.current.delete(index); }}
              type="button"
              className={`card${faceShown ? " card--face" : ""}${matched ? " card--matched" : ""}`}
              tabIndex={focused === index ? 0 : -1}
              aria-label={label}
              aria-disabled={matched ? "true" : undefined}
              onFocus={() => { setFocused(index); buttons.current.get(index)?.scrollIntoView({ block: "nearest", inline: "nearest" }); }}
              onKeyDown={(event) => onKeyDown(event, index)}
              onKeyUp={(event) => {
                if ((event.key === "Enter" || event.key === " ") && suppressedKeyboardClick.current) {
                  window.setTimeout(() => { suppressedKeyboardClick.current = false; }, 0);
                }
              }}
              onClick={(event) => {
                if (event.detail === 0 && suppressedKeyboardClick.current) {
                  suppressedKeyboardClick.current = false;
                  return;
                }
                if (event.detail === 0 && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
                if (!paused && !isWon(game)) onActivate(index);
              }}
            >
              {face === undefined ? <CardBack /> : <FaceArtwork id={face} />}
              {matched && <span className="match-check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
});
