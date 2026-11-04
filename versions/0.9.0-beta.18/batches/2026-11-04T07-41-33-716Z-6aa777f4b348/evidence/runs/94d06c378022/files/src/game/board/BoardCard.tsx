import { forwardRef } from 'react';
import type { FocusEvent, ForwardedRef, KeyboardEvent, MouseEvent } from 'react';
import { FaceArt } from './FaceArt.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './BoardCard.css';

interface BoardCardProps {
  readonly faceId: number;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly row: number;
  readonly column: number;
  readonly tabStop: boolean;
  readonly onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onActivate: () => void;
}

function HiddenBack() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" className="card-back-art">
      <path d="M50 28L72 50L50 72L28 50Z" fill="none" stroke="#757C9A" strokeWidth="4" />
    </svg>
  );
}

function CardView({ faceId, revealed, matched, row, column, tabStop, onFocus, onKeyDown, onActivate }: BoardCardProps, ref: ForwardedRef<HTMLButtonElement>) {
  const position = `Row ${row}, column ${column}`;
  const label = revealed
    ? `${position}, ${faceIdentity(faceId).name}, ${matched ? 'matched' : 'revealed'}`
    : `${position}, closed`;

  function activate(event: MouseEvent<HTMLButtonElement>): void {
    if (event.button !== 0) return;
    const native = event.nativeEvent;
    if (native.detail === 0 && (native.altKey || native.ctrlKey || native.metaKey || native.shiftKey)) return;
    onActivate();
  }

  return (
    <button
      ref={ref}
      type="button"
      className={`board-card${matched ? ' is-matched' : ''}`}
      data-state={matched ? 'matched' : revealed ? 'revealed' : 'closed'}
      aria-label={label}
      aria-disabled={matched ? 'true' : undefined}
      tabIndex={tabStop ? 0 : -1}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={activate}
    >
      {revealed ? <FaceArt id={faceId} /> : <HiddenBack />}
      {matched ? <span className="matched-check" aria-hidden="true">✓</span> : null}
    </button>
  );
}

export const BoardCard = forwardRef(CardView);
