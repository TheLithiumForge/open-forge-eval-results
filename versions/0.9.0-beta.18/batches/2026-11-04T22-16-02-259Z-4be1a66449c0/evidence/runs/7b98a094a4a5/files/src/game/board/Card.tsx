import { describeFace } from "../faces.js";
import { isMatched, type GameState } from "../state.js";
import { CardBackArtwork, FaceArtwork } from "./FaceArtwork.js";

interface CardProps {
  readonly game: GameState;
  readonly index: number;
  readonly tabStop: boolean;
  readonly buttonRef: (button: HTMLButtonElement | null) => void;
  readonly onActivate: (index: number) => void;
  readonly onFocus: (index: number, button: HTMLButtonElement) => void;
}

export function Card({ game, index, tabStop, buttonRef, onActivate, onFocus }: CardProps) {
  const matched = isMatched(game, index);
  const selected = game.selection.kind === "one" && game.selection.index === index;
  const mismatch =
    game.selection.kind === "mismatch" &&
    (game.selection.first === index || game.selection.second === index);
  const revealed = matched || selected || mismatch;
  const faceId = revealed ? game.board.deck[index] : undefined;
  const face = faceId === undefined ? null : describeFace(faceId);
  const stateName = matched ? "matched" : revealed ? "revealed" : "closed";
  const location = `Row ${Math.floor(index / game.board.size) + 1}, column ${(index % game.board.size) + 1}`;
  const name = face === null ? `${location}, closed` : `${location}, ${face.name}, ${stateName}`;

  return (
    <button
      ref={buttonRef}
      className={`card${matched ? " card--matched" : ""}${revealed ? " card--revealed" : ""}`}
      type="button"
      aria-label={name}
      aria-disabled={matched || undefined}
      tabIndex={tabStop ? 0 : -1}
      onClick={() => onActivate(index)}
      onFocus={(event) => onFocus(index, event.currentTarget)}
    >
      {face === null ? <CardBackArtwork /> : <FaceArtwork faceId={face.id} />}
      {matched && <span className="card__check" aria-hidden="true">✓</span>}
    </button>
  );
}
