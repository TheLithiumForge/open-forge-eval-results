import { Face } from './Face.tsx';
import { faceParts } from './faces.ts';
import type { KeyboardEvent } from 'react';
import './Card.css';

export type CardProps = {
  index: number; size: number; face: number; revealed: boolean; matched: boolean;
  tabStop: boolean; activate: (index: number) => void; onFocus: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
};

export function Card(props: CardProps) {
  const { index, size, face, revealed, matched } = props;
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = revealed ? `${position}, ${faceParts(face).name}, ${matched ? 'matched' : 'revealed'}`
    : `${position}, closed`;
  return <button type="button" className={`card${revealed ? ' revealed' : ''}${matched ? ' matched' : ''}`}
    aria-label={name} aria-disabled={matched || undefined} tabIndex={props.tabStop ? 0 : -1}
    onClick={event => {
      if (event.detail === 0 && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
      props.activate(index);
    }} onFocus={() => props.onFocus(index)} onKeyDown={event => props.onKeyDown(event, index)}>
    {revealed ? <Face id={face} /> : <span className="card-back" aria-hidden="true">◇</span>}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
}
