import { forwardRef } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { faceName, CardBack, FaceArtwork } from "./faces.tsx";

export const CARD_STATE = Object.freeze({ CLOSED: "closed", REVEALED: "revealed", MATCHED: "matched" } as const);
export type CardState = (typeof CARD_STATE)[keyof typeof CARD_STATE];

export type CardProps = Readonly<{
  index: number;
  size: number;
  faceId: number | null;
  state: CardState;
  tabIndex: 0 | -1;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: () => void;
}>;

function accessibleName(index: number, size: number, faceId: number | null, state: CardProps["state"]): string {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  if (faceId === null) return `Row ${row}, column ${column}, closed`;
  return `Row ${row}, column ${column}, ${faceName(faceId)}, ${state}`;
}

function artwork(faceId: number | null): ReactNode {
  if (faceId === null) return <CardBack />;
  return <FaceArtwork faceId={faceId} />;
}

export const Card = forwardRef<HTMLButtonElement, CardProps>(function Card(props, ref) {
  const label = accessibleName(props.index, props.size, props.faceId, props.state);
  return (
    <button
      type="button"
      ref={ref}
      className={`card card-${props.state}`}
      aria-label={label}
      aria-disabled={props.state === CARD_STATE.MATCHED ? "true" : undefined}
      tabIndex={props.tabIndex}
      onClick={props.onClick}
      onKeyDown={props.onKeyDown}
      onFocus={props.onFocus}
    >
      {artwork(props.faceId)}
      {props.state === CARD_STATE.MATCHED ? <span className="match-check" aria-hidden="true">✓</span> : null}
    </button>
  );
});
