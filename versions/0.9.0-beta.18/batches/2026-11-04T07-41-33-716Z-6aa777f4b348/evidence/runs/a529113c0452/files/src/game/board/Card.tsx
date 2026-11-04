import type { FocusEventHandler, KeyboardEventHandler } from 'react';
import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';
import './Card.css';

export const CARD_APPEARANCE = { closed: 'closed', revealed: 'revealed', matched: 'matched' } as const;
export type CardAppearance = Readonly<{ kind: typeof CARD_APPEARANCE.closed }>
  | Readonly<{ kind: typeof CARD_APPEARANCE.revealed | typeof CARD_APPEARANCE.matched; face: number }>;
type CardProps = Readonly<{
  appearance: CardAppearance;
  index: number;
  size: number;
  tabStop: boolean;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onFocus: FocusEventHandler<HTMLButtonElement>;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
  onActivate: (index: number) => void;
}>;

export function Card({ appearance, index, size, tabStop, buttonRef, onFocus, onKeyDown, onActivate }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = appearance.kind === CARD_APPEARANCE.closed ? `${position}, closed`
    : `${position}, ${faceIdentity(appearance.face).name}, ${appearance.kind}`;
  return (
    <button type="button" className={`card card--${appearance.kind}`} ref={buttonRef}
      tabIndex={tabStop ? 0 : -1} aria-label={name} aria-disabled={appearance.kind === CARD_APPEARANCE.matched}
      onFocus={onFocus} onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
      }}>
      {appearance.kind === CARD_APPEARANCE.closed ? (
        <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path d="M50 34L66 50L50 66L34 50Z" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      ) : <Face id={appearance.face} />}
      {appearance.kind === CARD_APPEARANCE.matched && (
        <svg className="card-check" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2 6L5 9L10 3" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}
