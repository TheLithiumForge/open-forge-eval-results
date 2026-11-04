import type { KeyboardEvent as ReactKeyboardEvent, RefCallback } from "react";
import { describeFace } from "./faceData.ts";
import { CardBack, FaceArtwork } from "./FaceArtwork.tsx";

interface CardProps {
  readonly index: number;
  readonly columns: number;
  readonly faceId: number;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly tabIndex: 0 | -1;
  readonly cardRef: RefCallback<HTMLButtonElement>;
  readonly onActivate: () => void;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
}

export function Card({ index, columns, faceId, revealed, matched, tabIndex, cardRef, onActivate, onFocus, onKeyDown }: CardProps) {
  const showFace = revealed || matched;
  const position = `Row ${Math.floor(index / columns) + 1}, column ${index % columns + 1}`;
  const face = showFace ? describeFace(faceId) : null;
  const state = matched ? "matched" : showFace ? "revealed" : "closed";
  const label = face === null ? `${position}, ${state}` : `${position}, ${face.name}, ${state}`;
  const badgeCorners = ["bottom-right", "bottom-left", "bottom-left", "top-left", "top-left", "top-right", "top-right", "bottom-right"] as const;
  const badgeCorner = badgeCorners[face?.markerIndex ?? 0] ?? "bottom-right";
  return (
    <button
      ref={cardRef}
      type="button"
      className={`memory-card${showFace ? " is-face" : ""}${matched ? " is-matched" : ""}`}
      aria-label={label}
      aria-disabled={matched || undefined}
      aria-pressed={showFace}
      tabIndex={tabIndex}
      onClick={(event) => {
        const modifiedKeyboardClick = event.detail === 0 && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
        if (event.button === 0 && !modifiedKeyboardClick) onActivate();
      }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      {showFace ? <FaceArtwork faceId={faceId} /> : <CardBack />}
      {matched ? <span className={`match-check at-${badgeCorner}`} aria-hidden="true">✓</span> : null}
    </button>
  );
}
