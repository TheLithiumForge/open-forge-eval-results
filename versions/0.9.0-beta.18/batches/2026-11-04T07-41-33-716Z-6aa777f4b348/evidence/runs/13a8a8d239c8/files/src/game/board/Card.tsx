import { Face } from './Face.tsx';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import './Card.css';

interface CardProps {
  readonly label: string;
  readonly faceId: number | null;
  readonly matched: boolean;
  readonly tabIndex: number;
  readonly size: number;
  readonly buttonRef: (element: HTMLButtonElement | null) => void;
  readonly onFocus: (element: HTMLButtonElement) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  readonly onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function Card({ label, faceId, matched, tabIndex, size, buttonRef, onFocus, onKeyDown, onClick }: CardProps) {
  const visible = faceId !== null;
  return (
    <button
      ref={buttonRef}
      className={`memory-card${visible ? ' memory-card--revealed' : ''}${matched ? ' memory-card--matched' : ''}`}
      type="button"
      tabIndex={tabIndex}
      aria-label={label}
      aria-disabled={matched}
      onFocus={(event) => onFocus(event.currentTarget)}
      onKeyDown={onKeyDown}
      onClick={onClick}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {visible && <span className="card-face"><Face faceId={faceId} /></span>}
      {!visible && <span className="card-back" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3 29 16 16 29 3 16Z" /></svg></span>}
      {matched && <span className="match-mark" aria-hidden="true">✓</span>}
    </button>
  );
}
