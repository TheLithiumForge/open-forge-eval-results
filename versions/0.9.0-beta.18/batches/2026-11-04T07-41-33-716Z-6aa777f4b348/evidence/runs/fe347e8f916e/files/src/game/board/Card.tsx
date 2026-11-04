import { memo, useRef } from 'react';
import { Face } from './Face.tsx';
import { faceParts } from './faces.ts';
import './Card.css';

export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number | null;
  readonly matched: boolean;
  readonly tabStop: boolean;
  readonly activate: (index: number) => void;
  readonly remember: (index: number) => void;
  readonly register: (index: number, button: HTMLButtonElement | null) => void;
}

export const Card = memo(function Card({ index, size, face, matched, tabStop, activate, remember, register }: CardProps) {
  const suppressKeyboard = useRef(false);
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === null ? `${position}, closed`
    : `${position}, ${faceParts(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" className={`card${matched ? ' matched' : face !== null ? ' revealed' : ''}`}
    ref={(button) => register(index, button)} tabIndex={tabStop ? 0 : -1}
    aria-label={name} aria-disabled={matched ? true : undefined}
    onFocus={(event) => {
      remember(index);
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        suppressKeyboard.current = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      }
    }}
    onClick={(event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          (event.detail === 0 && suppressKeyboard.current)) return;
      activate(index);
    }}>
    {face === null ? <span className="card-back" aria-hidden="true">◇</span> : <Face id={face} />}
    {matched && <span className="match-check" aria-hidden="true">✓</span>}
  </button>;
});
