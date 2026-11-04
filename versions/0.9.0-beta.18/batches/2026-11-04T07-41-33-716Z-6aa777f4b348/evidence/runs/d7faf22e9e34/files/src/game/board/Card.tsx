import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Face } from './Face.tsx';
import { faceIdentity } from './faces.ts';
import './Card.css';

interface CardProps {
  readonly game: GameState;
  readonly index: number;
  readonly tabIndex: number;
  readonly ref: Ref<HTMLButtonElement>;
  readonly onFocus: () => void;
  readonly onActivate: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export function Card({ game, index, tabIndex, ref, onFocus, onActivate, onKeyDown }: CardProps) {
  const matched = game.matched.includes(index);
  const selection = game.selection;
  const selected = selection.kind === 'one' ? selection.index === index
    : selection.kind === 'mismatch' && (selection.first === index || selection.second === index);
  const state = matched ? 'matched' : selected ? 'revealed' : 'closed';
  const face = state === 'closed' ? undefined : game.deck[index];
  const position = `Row ${Math.floor(index / game.board.size) + 1}, column ${index % game.board.size + 1}`;
  const name = face === undefined ? `${position}, closed` : `${position}, ${faceIdentity(face).name}, ${state}`;
  return <button type="button" className={`card ${state}`} ref={ref} tabIndex={tabIndex}
    aria-label={name} aria-disabled={matched ? true : undefined} onFocus={onFocus} onKeyDown={onKeyDown}
    onClick={(event) => {
      if (event.button !== 0 || (event.detail === 0 &&
          (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey))) return;
      onActivate();
    }}>
    {face === undefined ? <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 32 68 50 50 68 32 50Z" fill="none" stroke="#757C9A" strokeWidth="3" />
    </svg> : <Face id={face} />}
    {matched && <svg className="match-check" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="m87 93 4 4 7-8" fill="none" stroke="#8BEA7D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>}
  </button>;
}
