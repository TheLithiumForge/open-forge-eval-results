import type { KeyboardEvent } from 'react';
import { Face } from './Face.tsx';
import { describeFace } from './faces.ts';
import './Card.css';

export type CardProps = Readonly<{
  index: number; size: number; face: number | undefined; matched: boolean; tabStop: boolean;
  onActivate(index: number): void; onFocus(index: number): void;
  onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void;
}>;
export function Card({ index, size, face, matched, tabStop, onActivate, onFocus, onKeyDown }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === undefined ? `${position}, closed`
    : `${position}, ${describeFace(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" className={`card${face === undefined ? '' : ' revealed'}${matched ? ' matched' : ''}`}
    aria-label={name} aria-disabled={matched ? true : undefined} tabIndex={tabStop ? 0 : -1}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
    }}
    onKeyDown={event => onKeyDown(event, index)}
    onFocus={event => {
      onFocus(index);
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}>
    {face === undefined ? <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="m50 36 14 14-14 14-14-14Z" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg> : <Face id={face} />}
    {matched && <svg className="match-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>}
  </button>;
}
