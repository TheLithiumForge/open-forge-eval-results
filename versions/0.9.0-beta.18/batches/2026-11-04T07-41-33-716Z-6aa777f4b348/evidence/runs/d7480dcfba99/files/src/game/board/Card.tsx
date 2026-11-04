import type { KeyboardEvent, Ref } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

type Props = {
  index: number; size: number; face: number | undefined; matched: boolean; tabIndex: number;
  buttonRef: Ref<HTMLButtonElement>; onFocus: () => void; onActivate: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};
export function Card({ index, size, face, matched, tabIndex, buttonRef, onFocus, onActivate, onKeyDown }: Props) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === undefined ? `${position}, closed`
    : `${position}, ${faceIdentity(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" ref={buttonRef} className={`card${matched ? ' matched' : face !== undefined ? ' revealed' : ''}`}
    aria-label={name} aria-disabled={matched ? true : undefined} tabIndex={tabIndex}
    onFocus={onFocus} onClick={event => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate();
    }} onKeyDown={onKeyDown}>
    {face === undefined ? <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path className="card-back" d="M50 35 L65 50 L50 65 L35 50 Z" />
    </svg> : <Face id={face} />}
    {matched && <span className="check" aria-hidden="true">✓</span>}
  </button>;
}
