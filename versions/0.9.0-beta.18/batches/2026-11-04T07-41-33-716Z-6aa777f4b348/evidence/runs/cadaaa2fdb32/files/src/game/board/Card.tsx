import { memo, useRef } from 'react';
import { describeFace } from './faces.ts';
import { Face } from './Face.tsx';
import './Card.css';

interface CardProps {
  index: number;
  size: number;
  face: number | undefined;
  matched: boolean;
  tabStop: boolean;
  onActivate: (index: number) => void;
  onFocus: (index: number) => void;
}

export const Card = memo(function Card({ index, size, face, matched, tabStop, onActivate, onFocus }: CardProps) {
  const keyboardAllowed = useRef(true);
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const state = matched ? 'matched' : 'revealed';
  const name = face === undefined ? `${position}, closed` : `${position}, ${describeFace(face).name}, ${state}`;
  return <button type="button" className={`card${face === undefined ? '' : ' revealed'}${matched ? ' matched' : ''}`}
    aria-label={name} aria-disabled={matched ? true : undefined} tabIndex={tabStop ? 0 : -1}
    onPointerDown={() => { keyboardAllowed.current = true; }}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {
        keyboardAllowed.current = !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
      }
    }}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
          (event.detail > 0 || keyboardAllowed.current)) onActivate(index);
    }}
    onFocus={event => {
      onFocus(index);
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}>
    {face === undefined ? <span className="card-back" aria-hidden="true">◇</span> : <Face id={face} />}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
});
