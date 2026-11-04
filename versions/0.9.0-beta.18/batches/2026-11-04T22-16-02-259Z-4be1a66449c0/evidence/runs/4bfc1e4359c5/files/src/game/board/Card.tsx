import type { KeyboardEvent } from "react";
import { isMatched, isRevealed, type GameState } from "../state.ts";
import { CardBack, FaceArtwork } from "./Face.tsx";
import { faceName } from "./faces.ts";
import "./board.css";

type CardProps = {
  state: GameState;
  index: number;
  tabStop: boolean;
  onActivate: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  onFocus: (index: number) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
};

export function Card({ state, index, tabStop, onActivate, onKeyDown, onFocus, buttonRef }: CardProps) {
  const matched = isMatched(state, index);
  const revealed = isRevealed(state, index);
  const faceId = revealed ? state.board.deck[index]! : null;
  const row = Math.floor(index / state.board.size) + 1;
  const column = (index % state.board.size) + 1;
  const stateName = matched ? "matched" : revealed ? "revealed" : "closed";
  const name = revealed
    ? `Row ${row}, column ${column}, ${faceName(faceId!)}, ${stateName}`
    : `Row ${row}, column ${column}, closed`;
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`memoryCard${revealed ? " isRevealed" : ""}${matched ? " isMatched" : ""}`}
      aria-label={name}
      aria-disabled={matched ? "true" : undefined}
      tabIndex={tabStop ? 0 : -1}
      onClick={() => onActivate(index)}
      onKeyDown={(event) => onKeyDown(event, index)}
      onFocus={(event) => {
        onFocus(index);
        event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
      }}
    >
      {revealed && faceId !== null ? <FaceArtwork faceId={faceId} /> : <CardBack />}
      {matched && <span className="matchedMark" aria-hidden="true">✓</span>}
    </button>
  );
}
