import type { KeyboardEvent, Ref } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number | null;
  readonly matched: boolean;
  readonly tabStop: boolean;
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly onFocus: (index: number, card: HTMLButtonElement) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  readonly onActivate: (index: number) => void;
}

export function Card({ index, size, face, matched, tabStop, buttonRef, onFocus, onKeyDown, onActivate }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === null ? `${position}, closed`
    : `${position}, ${faceIdentity(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" ref={buttonRef} tabIndex={tabStop ? 0 : -1}
    className={`card${face !== null ? ' card--revealed' : ''}${matched ? ' card--matched' : ''}`}
    aria-label={name} aria-disabled={matched ? true : undefined}
    onFocus={event => onFocus(index, event.currentTarget)} onKeyDown={event => onKeyDown(event, index)}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
    }}>
    {face === null ? <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100">
      <path d="M50 34 L66 50 L50 66 L34 50 Z" fill="none" stroke="#757C9A" strokeWidth="3" />
    </svg> : <Face id={face} />}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
}
