import type { KeyboardEvent, Ref } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

export const CARD_STATES = ['closed', 'revealed', 'matched'] as const;
export type CardState = (typeof CARD_STATES)[number];
export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly face: number;
  readonly state: CardState;
  readonly tabIndex: number;
  readonly blocked: boolean;
  readonly ref: Ref<HTMLButtonElement>;
  readonly onActivate: () => void;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export function Card(props: CardProps) {
  const { index, size, face, state, tabIndex, blocked, ref, onActivate, onFocus, onKeyDown } = props;
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = state === 'closed' ? `${position}, closed` : `${position}, ${faceIdentity(face).name}, ${state}`;
  return (
    <button type="button" className={`card card--${state}`} ref={ref} tabIndex={tabIndex}
      aria-label={name} aria-disabled={state === 'matched' || blocked ? true : undefined}
      onFocus={onFocus} onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate();
      }}>
      {state === 'closed' ? (
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="card-back">
          <path d="M50 34L66 50L50 66L34 50Z" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      ) : <Face id={face} />}
      {state === 'matched' && <span className="card-check" aria-hidden="true">✓</span>}
    </button>
  );
}
