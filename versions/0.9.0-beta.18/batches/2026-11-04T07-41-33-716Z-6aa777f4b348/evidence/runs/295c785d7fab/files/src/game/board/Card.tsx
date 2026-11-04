import type { KeyboardEvent } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './face.ts';
import './card.css';

type CardProps = Readonly<{
  index: number; size: number; face: number | null; matched: boolean; tabIndex: number;
  activate: () => void; remember: (element: HTMLButtonElement) => void;
  navigate: (event: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}>;

export function Card({ index, size, face, matched, tabIndex, activate, remember, navigate, buttonRef }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const state = matched ? 'matched' : 'revealed';
  const name = face === null ? `${position}, closed` : `${position}, ${faceIdentity(face).name}, ${state}`;
  return <button type="button" className={`card${face !== null ? ' revealed' : ''}${matched ? ' matched' : ''}`}
    ref={buttonRef} tabIndex={tabIndex} aria-label={name} aria-disabled={matched || undefined}
    onFocus={event => remember(event.currentTarget)} onKeyDown={navigate}
    onClick={event => {
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) activate();
    }}>
    {face === null ? <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="m50 37 13 13-13 13-13-13Z" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg> : <Face id={face} />}
    {matched && <svg className="match-check" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="m3 90 5 5 10-10" fill="none" stroke="#8BEA7D" strokeWidth="3" />
    </svg>}
  </button>;
}
