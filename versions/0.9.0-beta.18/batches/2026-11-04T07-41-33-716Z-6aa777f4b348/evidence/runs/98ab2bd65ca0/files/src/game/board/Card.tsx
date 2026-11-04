import { forwardRef, type KeyboardEvent, type MouseEvent } from "react";
import { SELECTION_KINDS, type GameState } from "../state.ts";
import { Face } from "./Face.tsx";
import { getFaceData } from "./face-data.ts";
import { focusDestination, type ArrowDirection } from "./navigation.ts";
import "./Face.css";
import "./Card.css";

export interface CardProps {
  readonly game: GameState;
  readonly index: number;
  readonly tabStop: boolean;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
  readonly onFocusCard: (index: number) => void;
  readonly onMoveFocus: (index: number) => void;
}

function isMatched(game: GameState, index: number): boolean {
  return game.matched.includes(index);
}

function isRevealed(game: GameState, index: number, matched: boolean): boolean {
  if (matched) return true;
  if (game.selection.kind === SELECTION_KINDS.one) return game.selection.index === index;
  return game.selection.kind === SELECTION_KINDS.mismatch &&
    (game.selection.first === index || game.selection.second === index);
}

function handleClick(event: MouseEvent<HTMLButtonElement>, activate: () => void): void {
  if (
    event.button !== 0 ||
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
  ) {
    return;
  }
  activate();
}

function isArrowDirection(key: string): key is ArrowDirection {
  return key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";
}

function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number, size: number, move: (index: number) => void): void {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (!isArrowDirection(event.key)) return;
  event.preventDefault();
  move(focusDestination(index, size, event.key));
}

export const Card = forwardRef<HTMLButtonElement, CardProps>(function Card({
  game,
  index,
  tabStop,
  paused,
  onActivate,
  onFocusCard,
  onMoveFocus,
}, ref) {
  const size = game.board.size;
  const matched = isMatched(game, index);
  const revealed = isRevealed(game, index, matched);
  const faceId = revealed ? game.board.deck[index] : undefined;
  const face = faceId === undefined ? null : getFaceData(faceId);
  const row = Math.floor(index / size) + 1;
  const column = (index % size) + 1;
  const stateName = matched ? "matched" : revealed ? "revealed" : "closed";
  const position = `Row ${row}, column ${column}`;
  const name = face === null
    ? `${position}, closed`
    : `${position}, ${face.accessibleName}, ${stateName}`;
  const blocked = paused || matched || game.selection.kind === SELECTION_KINDS.mismatch;

  return (
    <button
      aria-label={name}
      aria-disabled={blocked}
      className={`card-button ${revealed ? "card-button--face" : "card-button--back"}${matched ? " card-button--matched" : ""}`}
      onClick={(event) => handleClick(event, () => onActivate(index))}
      onFocus={() => onFocusCard(index)}
      onKeyDown={(event) => handleKeyDown(event, index, size, onMoveFocus)}
      ref={ref}
      tabIndex={tabStop ? 0 : -1}
      type="button"
    >
      {face === null ? (
        <span aria-hidden="true" className="card-back-mark" />
      ) : (
        <span className="card-face"><Face face={face} /></span>
      )}
      {matched ? <span aria-hidden="true" className="card-check">✓</span> : null}
    </button>
  );
});
