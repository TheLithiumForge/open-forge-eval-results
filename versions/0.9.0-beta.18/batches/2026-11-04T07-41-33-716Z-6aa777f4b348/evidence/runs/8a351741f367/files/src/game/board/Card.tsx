import type { RefCallback } from 'react';
import { appearance } from './appearance.ts';
import { Face } from './Face.tsx';
import './Card.css';

interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly tabIndex: number;
  readonly buttonRef: RefCallback<HTMLButtonElement>;
  readonly onFocus: (index: number) => void;
  readonly onActivate: (index: number) => void;
}

export function Card({ index, size, face, revealed, matched, tabIndex, buttonRef, onFocus, onActivate }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const label = revealed ? `${position}, ${appearance(face).name}, ${matched ? 'matched' : 'revealed'}` : `${position}, closed`;
  return <button type="button" ref={buttonRef} className={`card${revealed ? ' card--revealed' : ''}${matched ? ' card--matched' : ''}`}
    tabIndex={tabIndex} aria-label={label} aria-disabled={matched || undefined}
    onFocus={(event) => {
      onFocus(index);
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}
    onClick={(event) => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
    }}>
    {revealed ? <Face face={face} /> : <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 34 66 50 50 66 34 50Z" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>}
    {matched && <span className="card__check" aria-hidden="true">✓</span>}
  </button>;
}
