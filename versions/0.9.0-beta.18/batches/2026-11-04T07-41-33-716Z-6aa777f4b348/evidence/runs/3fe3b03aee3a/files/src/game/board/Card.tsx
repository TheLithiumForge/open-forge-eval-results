import type { CSSProperties, FocusEventHandler, KeyboardEventHandler, MouseEventHandler } from "react";
import { CardBack, FaceArtwork, faceName } from "./faces.tsx";
import "./card.css";

export type CardProps = Readonly<{
  index: number;
  size: number;
  face: number | null;
  matched: boolean;
  tabStop: boolean;
  buttonRef(element: HTMLButtonElement | null): void;
  onActivate(index: number): void;
  onFocus(index: number): void;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
}>;

export function Card({ index, size, face, matched, tabStop, buttonRef, onActivate, onFocus, onKeyDown }: CardProps) {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  const revealed = face !== null;
  const label = revealed
    ? `Row ${row}, column ${column}, ${faceName(face)}, ${matched ? "matched" : "revealed"}`
    : `Row ${row}, column ${column}, closed`;
  const cardStyle = { scrollMargin: "6px" } satisfies CSSProperties;
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    onActivate(index);
  };
  const handleFocus: FocusEventHandler<HTMLButtonElement> = () => onFocus(index);

  return (
    <button
      ref={buttonRef}
      className={`memory-card${revealed ? " is-revealed" : ""}${matched ? " is-matched" : ""}`}
      type="button"
      aria-label={label}
      aria-disabled={matched ? "true" : undefined}
      tabIndex={tabStop ? 0 : -1}
      style={cardStyle}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={onKeyDown}
    >
      {face !== null ? <FaceArtwork face={face} /> : <CardBack />}
      {matched && <span className="matched-mark" aria-hidden="true">✓</span>}
    </button>
  );
}
