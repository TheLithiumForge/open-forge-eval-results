import type { KeyboardEvent } from 'react';
import { Face } from './Face.tsx';
import { faceDescription } from './faces.ts';
import './Card.css';

export type CardProps = Readonly<{
  index: number; size: number; face: number | undefined;
  matched: boolean; blocked: boolean; tabStop: boolean;
  onActivate: (index: number) => void;
  onFocus: (index: number) => void;
  onNavigate: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}>;

export function Card(props: CardProps) {
  const { index, size, face, matched, blocked, tabStop, onActivate, onFocus, onNavigate } = props;
  const position = 'Row ' + (Math.floor(index / size) + 1) + ', column ' + (index % size + 1);
  const label = face === undefined ? position + ', closed'
    : position + ', ' + faceDescription(face).name + (matched ? ', matched' : ', revealed');
  return <button type="button" className={'card' + (face === undefined ? '' : ' revealed') + (matched ? ' matched' : '')}
    aria-label={label} aria-disabled={matched || blocked} tabIndex={tabStop ? 0 : -1}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
    }}
    onKeyDown={event => onNavigate(event, index)}
    onFocus={event => {
      onFocus(index);
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}>
    {face === undefined ? <span className="card-back" aria-hidden="true">◇</span> : <Face id={face} />}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
}
