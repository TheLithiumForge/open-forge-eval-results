import type { KeyboardEvent } from 'react';
import { Face, faceName } from './Face.tsx';

type CardProps = {
  index: number; size: number; face: number | undefined; matched: boolean; tabStop: boolean;
  activate: (index: number) => void; remember: (index: number) => void;
  navigate: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
};
export function Card({ index, size, face, matched, tabStop, activate, remember, navigate }: CardProps) {
  const name = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}, `
    + (face === undefined ? 'closed' : `${faceName(face)}, ${matched ? 'matched' : 'revealed'}`);
  return <button type="button" className={`card${face !== undefined ? ' revealed' : ''}${matched ? ' matched' : ''}`}
    aria-label={name} aria-disabled={matched || undefined} tabIndex={tabStop ? 0 : -1}
    onClick={() => activate(index)} onKeyDown={event => navigate(event, index)}
    onFocus={event => { remember(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}>
    {face === undefined ? <span className="card-back" aria-hidden="true">◇</span> : <Face id={face} />}
    {matched && <span className="check" aria-hidden="true">✓</span>}
  </button>;
}
