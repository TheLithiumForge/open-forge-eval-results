import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { FaceArtwork } from "./FaceArtwork.tsx";
import { describeFace } from "./faces.ts";

export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly faceId: number;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly tabStop: boolean;
  readonly onActivate: (index: number) => void;
  readonly onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly setRef: (index: number, element: HTMLButtonElement | null) => void;
}

function cardName(index: number, size: number, faceId: number, revealed: boolean, matched: boolean): string {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  if (matched) return `Row ${row}, column ${column}, ${describeFace(faceId)?.name ?? "matched face"}, matched`;
  if (revealed) return `Row ${row}, column ${column}, ${describeFace(faceId)?.name ?? "revealed face"}, revealed`;
  return `Row ${row}, column ${column}, closed`;
}

export function Card({ index, size, faceId, revealed, matched, tabStop, onActivate, onFocus, onKeyDown, setRef }: CardProps) {
  const showFace = revealed || matched;
  const name = cardName(index, size, faceId, revealed, matched);
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    onActivate(index);
  };

  return (
    <button
      ref={(element) => setRef(index, element)}
      type="button"
      className={`card${showFace ? " card--face" : ""}${matched ? " card--matched" : ""}`}
      aria-label={name}
      aria-disabled={matched ? "true" : undefined}
      tabIndex={tabStop ? 0 : -1}
      onClick={handleClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      {showFace ? <FaceArtwork faceId={faceId} /> : <span className="card-back" aria-hidden="true" />}
      {matched && <svg className="match-check" aria-hidden="true" viewBox="0 0 8 8"><path d="m1 4 2 2 4-5" /></svg>}
    </button>
  );
}
