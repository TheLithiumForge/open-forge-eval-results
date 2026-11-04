import { memo } from 'react';
import { Face } from './Face.tsx';
import { faceName } from './faces.ts';
import './Card.css';

type Props = {
  index: number; size: number; face: number; revealed: boolean; matched: boolean;
  tabStop: boolean; onActivate: (index: number) => void; onFocus: (index: number) => void;
};

export const Card = memo(function Card({ index, size, face, revealed, matched, tabStop, onActivate, onFocus }: Props) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const state = matched ? 'matched' : revealed ? 'revealed' : 'closed';
  return <button type="button" className={`card ${state}`} tabIndex={tabStop ? 0 : -1}
    aria-label={`${position}, ${revealed || matched ? `${faceName(face)}, ` : ''}${state}`}
    aria-disabled={matched ? true : undefined}
    onFocus={event => {
      onFocus(index);
      event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
    }}>
    {revealed || matched ? <Face id={face} /> : <span className="card-back" aria-hidden="true">◇</span>}
    {matched && <span className="match-check" aria-hidden="true">✓</span>}
  </button>;
});
