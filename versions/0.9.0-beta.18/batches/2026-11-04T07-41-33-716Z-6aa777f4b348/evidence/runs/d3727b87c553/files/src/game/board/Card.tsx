import type { KeyboardEvent, Ref } from 'react';
import { Face } from './Face.tsx';
import { describeFace } from './face.ts';
import './Card.css';

export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number | null;
  readonly matched: boolean;
  readonly blocked: boolean;
  readonly tabStop: boolean;
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onActivate: () => void;
}
export function Card(props: CardProps) {
  const position = `Row ${Math.floor(props.index / props.size) + 1}, column ${props.index % props.size + 1}`;
  const state = props.matched ? 'matched' : props.face === null ? 'closed' : 'revealed';
  const label = props.face === null ? `${position}, closed` : `${position}, ${describeFace(props.face).name}, ${state}`;
  return <button type="button" ref={props.buttonRef} className={`card ${state}`} aria-label={label}
    aria-disabled={props.matched || props.blocked} tabIndex={props.tabStop ? 0 : -1}
    onFocus={props.onFocus} onKeyDown={props.onKeyDown}
    onClick={(event) => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) props.onActivate();
    }}>
    {props.face === null
      ? <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 35 65 50 50 65 35 50Z" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
      : <Face id={props.face} />}
    {props.matched && <span className="matched-check" aria-hidden="true">✓</span>}
  </button>;
}
