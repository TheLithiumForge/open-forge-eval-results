import type { KeyboardEvent } from 'react';
import { Face } from './Face.tsx';
import { faceName } from './faces.ts';
import './Card.css';

interface CardProps {
  index: number; size: number; face: number | undefined; matched: boolean; tabStop: boolean;
  onActivate: (index: number) => void; onFocus: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

export function Card({ index, size, face, matched, tabStop, onActivate, onFocus, onKeyDown }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === undefined ? `${position}, closed`
    : `${position}, ${faceName(face)}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" className={`card ${face === undefined ? '' : 'revealed'} ${matched ? 'matched' : ''}`}
    aria-label={name} aria-disabled={matched || undefined} tabIndex={tabStop ? 0 : -1}
    onFocus={() => onFocus(index)} onKeyDown={event => onKeyDown(event, index)}
    onClick={event => { if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index); }}>
    {face === undefined ? <span className="card-back" aria-hidden="true">◇</span> : <Face id={face} />}
    {matched && <span className="match-check" aria-hidden="true">✓</span>}
  </button>;
}
