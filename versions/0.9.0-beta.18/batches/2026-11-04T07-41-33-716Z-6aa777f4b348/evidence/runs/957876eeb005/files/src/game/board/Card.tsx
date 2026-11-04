import type { FocusEventHandler, KeyboardEventHandler, MouseEventHandler, Ref } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './face-identity.ts';
import './Card.css';

export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly tabIndex: number;
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly onFocus: FocusEventHandler<HTMLButtonElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
  readonly onActivate: () => void;
}

export function Card({ index, size, face, revealed, matched, tabIndex, buttonRef, onFocus, onKeyDown, onActivate }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = revealed ? `${position}, ${faceIdentity(face).name}, ${matched ? 'matched' : 'revealed'}` : `${position}, closed`;
  const activate: MouseEventHandler<HTMLButtonElement> = event => {
    if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate();
  };
  return (
    <button type="button" className={`card${revealed ? ' card--revealed' : ''}${matched ? ' card--matched' : ''}`}
      ref={buttonRef} tabIndex={tabIndex} aria-label={name} aria-disabled={matched ? true : undefined}
      onClick={activate} onFocus={onFocus} onKeyDown={onKeyDown}>
      {revealed ? <Face id={face} /> : (
        <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path d="M50 34 66 50 50 66 34 50Z" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      )}
      {matched && <span className="card-check" aria-hidden="true">✓</span>}
    </button>
  );
}
