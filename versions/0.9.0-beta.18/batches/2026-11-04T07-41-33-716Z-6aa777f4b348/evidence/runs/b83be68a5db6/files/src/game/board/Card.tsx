import { memo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Face } from './Face.tsx';
import { faceParts } from './face.ts';

interface CardProps {
  index: number;
  size: number;
  face: number | undefined;
  matched: boolean;
  tabStop: boolean;
  onActivate(index: number): void;
  onFocus(index: number, element: HTMLButtonElement): void;
  onNavigate(event: KeyboardEvent<HTMLButtonElement>, index: number): void;
}

export const Card = memo(function Card(props: CardProps) {
  const { index, size, face, matched, tabStop, onActivate, onFocus, onNavigate } = props;
  const suppressClick = useRef(false);
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === undefined ? `${position}, closed`
    : `${position}, ${faceParts(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" className={`card${face !== undefined ? ' revealed' : ''}${matched ? ' matched' : ''}`}
    aria-label={name} aria-disabled={matched ? true : undefined} tabIndex={tabStop ? 0 : -1}
    onFocus={event => onFocus(index, event.currentTarget)}
    onPointerDown={() => { suppressClick.current = false; }}
    onPointerCancel={() => { suppressClick.current = true; }}
    onContextMenu={() => { suppressClick.current = true; }}
    onKeyDown={event => {
      const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
      suppressClick.current = modified;
      if (modified) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate(index);
      } else onNavigate(event, index);
    }}
    onClick={event => { if (event.button === 0 && !suppressClick.current) onActivate(index); }}>
    {face === undefined ? <span className="card-back" aria-hidden="true">◇</span> : <Face id={face} />}
    {matched && <span className="match-check" aria-hidden="true">✓</span>}
  </button>;
});
