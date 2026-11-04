import { Face, getFaceName } from './Face.tsx';
import type { KeyboardEvent, MouseEvent } from 'react';
import './Card.css';

type CardProps = Readonly<{
  index: number;
  side: number;
  faceId: number | null;
  matched: boolean;
  tabIndex: 0 | -1;
  buttonRef: (button: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onActivate: () => void;
}>;

export function Card({ index, side, faceId, matched, tabIndex, buttonRef, onFocus, onKeyDown, onActivate }: CardProps) {
  const row = Math.floor(index / side) + 1;
  const column = index % side + 1;
  const ariaName = faceId === null ? `Row ${row}, column ${column}, closed`
    : `Row ${row}, column ${column}, ${getFaceName(faceId)}, ${matched ? 'matched' : 'revealed'}`;
  return (
    <button ref={buttonRef} className={`game-card${matched ? ' is-matched' : faceId !== null ? ' is-revealed' : ''}`}
      type="button" tabIndex={tabIndex} aria-label={ariaName} aria-disabled={matched}
      onFocus={onFocus} onKeyDown={onKeyDown} onClick={(event: MouseEvent<HTMLButtonElement>) => {
        const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        if (event.detail === 0 && modified) return;
        onActivate();
      }}>
      {faceId === null ? <svg className="card-back-mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 32 68 50 50 68 32 50Z" /></svg>
        : <Face id={faceId} />}
      {matched ? <span className="matched-mark" aria-hidden="true">✓</span> : null}
    </button>
  );
}
