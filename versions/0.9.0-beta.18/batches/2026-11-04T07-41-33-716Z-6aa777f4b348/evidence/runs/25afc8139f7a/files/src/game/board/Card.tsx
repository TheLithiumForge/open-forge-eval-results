import type { KeyboardEvent, Ref } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

type CardProps = Readonly<{
  index: number;
  size: number;
  face: number | null;
  matched: boolean;
  blocked: boolean;
  tabStop: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  activate: () => void;
}>;

export function Card(props: CardProps) {
  const { index, size, face, matched } = props;
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === null ? `${position}, closed`
    : `${position}, ${faceIdentity(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button
    type="button" ref={props.buttonRef}
    className={`card ${face === null ? 'card-closed' : 'card-revealed'}${matched ? ' card-matched' : ''}`}
    aria-label={name} aria-disabled={matched || props.blocked}
    tabIndex={props.tabStop ? 0 : -1}
    onFocus={props.onFocus} onKeyDown={props.onKeyDown}
    onClick={(event) => {
      if (event.button === 0) props.activate();
    }}
  >
    {face === null ? <span className="card-back" aria-hidden="true" /> : <Face id={face} />}
    {matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
}
