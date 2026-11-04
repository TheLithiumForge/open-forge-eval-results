import type { KeyboardEvent } from 'react';
import { CardFace } from './CardFace.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

type CardProps = Readonly<{
  index: number; size: number; face: number; revealed: boolean; matched: boolean;
  blocked: boolean; tabStop: boolean; onActivate: () => void;
  onFocus: (button: HTMLButtonElement) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}>;

export function Card({ index, size, face, revealed, matched, blocked, tabStop,
  onActivate, onFocus, onKeyDown }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = revealed ? `${position}, ${faceIdentity(face).name}, ${matched ? 'matched' : 'revealed'}`
    : `${position}, closed`;
  return <button type="button" className={`card${revealed ? ' revealed' : ''}${matched ? ' matched' : ''}`}
    aria-label={name} aria-disabled={matched || blocked ? true : undefined} tabIndex={tabStop ? 0 : -1}
    onFocus={(event) => onFocus(event.currentTarget)} onKeyDown={onKeyDown}
    onClick={(event) => {
      if (event.button !== 0 || (event.detail === 0
        && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey))) return;
      onActivate();
    }}>
    {revealed ? <CardFace id={face} /> : <span className="card-back" aria-hidden="true">◇</span>}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
}
