import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number | null;
  readonly matched: boolean;
  readonly tabIndex: number;
  readonly onActivate: () => void;
  readonly onFocus: (card: HTMLButtonElement) => void;
}

export function Card({ index, size, face, matched, tabIndex, onActivate, onFocus }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = face === null ? `${position}, closed`
    : `${position}, ${faceIdentity(face).name}, ${matched ? 'matched' : 'revealed'}`;
  return <button type="button" className={`card${face !== null ? ' card-revealed' : ''}${matched ? ' card-matched' : ''}`}
    aria-label={name} aria-disabled={matched ? true : undefined} tabIndex={tabIndex}
    onClick={onActivate} onFocus={event => onFocus(event.currentTarget)}>
    {face === null ? <span className="card-back" aria-hidden="true" /> : <Face id={face} />}
    {matched && <svg className="card-check" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M4 8 6 10 11 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>}
  </button>;
}
