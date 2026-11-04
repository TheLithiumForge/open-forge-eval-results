import {
  forwardRef, useImperativeHandle, useRef, useState,
  type CSSProperties, type KeyboardEvent,
} from "react";
import { faceName, getFace } from "../faces.ts";
import type { GameState } from "../types.ts";
import "./Board.css";

export type BoardHandle = { focusRemembered(): void };
type Props = { readonly game: GameState; readonly onActivate: (index: number) => void };
const FACE_BACKGROUND = "#111625";

const PATHS = {
  circle: "M50 26A24 24 0 1 1 50 74A24 24 0 1 1 50 26Z",
  square: "M26 26H74V74H26Z",
  triangle: "M50 26L74 72H26Z",
  diamond: "M50 26L74 50L50 74L26 50Z",
  star: "M50 25L56 42L74 43L60 55L64 73L50 63L36 73L40 55L26 43L44 42Z",
  hexagon: "M38 26H62L74 50L62 74H38L26 50Z",
  plus: "M42 26H58V42H74V58H58V74H42V58H26V42H42Z",
  chevron: "M27 30L50 51L73 30V49L50 72L27 49Z",
} as const;

export const Board = forwardRef<BoardHandle, Props>(function Board({ game, onActivate }, ref) {
  const [remembered, setRemembered] = useState(0);
  const rememberedRef = useRef(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  useImperativeHandle(ref, () => ({
    focusRemembered: () => buttons.current[rememberedRef.current]?.focus(),
  }), []);

  function moveFocus(index: number, event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(index / game.size);
    const column = index % game.size;
    let next = index;
    if (event.key === "ArrowLeft") next = column > 0 ? index - 1 : index;
    else if (event.key === "ArrowRight") next = column < game.size - 1 ? index + 1 : index;
    else if (event.key === "ArrowUp") next = row > 0 ? index - game.size : index;
    else if (event.key === "ArrowDown") next = row < game.size - 1 ? index + game.size : index;
    else return;
    event.preventDefault();
    rememberedRef.current = next;
    setRemembered(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="board-scroll" role="group" aria-label="Card board">
      <div className="card-grid" style={{ "--columns": game.size } as CSSProperties}>
        {game.deck.map((face, index) => {
          const matched = game.matched.includes(index);
          const selected = game.selection.kind === "one"
            ? game.selection.index === index
            : game.selection.kind === "mismatch" &&
              (game.selection.first === index || game.selection.second === index);
          const revealed = matched || selected;
          const row = Math.floor(index / game.size) + 1;
          const column = (index % game.size) + 1;
          const name = revealed
            ? "Row " + row + ", column " + column + ", " + faceName(face) + ", " +
              (matched ? "matched" : "revealed")
            : "Row " + row + ", column " + column + ", closed";
          return (
            <button
              key={index}
              ref={(element) => { buttons.current[index] = element; }}
              type="button"
              className={"card" + (revealed ? " card-face" : "") + (matched ? " card-matched" : "")}
              aria-label={name}
              aria-disabled={matched ? "true" : undefined}
              tabIndex={remembered === index ? 0 : -1}
              onFocus={(event) => {
                rememberedRef.current = index;
                setRemembered(index);
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              onKeyDown={(event) => moveFocus(index, event)}
              onClick={() => onActivate(index)}
            >
              {revealed ? <FaceArt id={face} matched={matched} /> : <CardBack />}
            </button>
          );
        })}
      </div>
    </div>
  );
});

function CardBack() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100">
      <path d="M50 25L75 50L50 75L25 50Z" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  );
}

function FaceArt({ id, matched }: { readonly id: number; readonly matched: boolean }) {
  const face = getFace(id);
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 100 100">
        <path
          d={PATHS[face.shape]}
          fill={face.fill === "solid" ? face.color : "none"}
          stroke={face.fill === "outline" ? face.color : "none"}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle
          cx={face.markerX} cy={face.markerY} r="5" fill={face.color}
          stroke={FACE_BACKGROUND} strokeWidth="3"
        />
      </svg>
      {matched && <span className="matched-check" aria-hidden="true">✓</span>}
    </>
  );
}
