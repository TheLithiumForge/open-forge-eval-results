import { memo } from 'react';
import { describeFace } from './faces.ts';
import { Face } from './Face.tsx';
import './Card.css';

export interface CardProps {
  index: number;
  size: number;
  face: number | null;
  matched: boolean;
  blocked: boolean;
  tabStop: boolean;
  onActivate: (index: number) => void;
}

export const Card = memo(function Card({ index, size, face, matched, blocked, tabStop, onActivate }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const state = matched ? 'matched' : face === null ? 'closed' : 'revealed';
  const label = face === null ? `${position}, closed` : `${position}, ${describeFace(face).name}, ${state}`;
  return <button type="button" className={`card card--${state}`} data-position={index}
    tabIndex={tabStop ? 0 : -1} aria-label={label} aria-disabled={matched || blocked}
    onClick={(event) => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      onActivate(index);
    }}>
    {face === null ? <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 34 66 50 50 66 34 50Z" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg> : <Face face={face} />}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
});
