import type { Ref } from 'react';
import { CardFace } from './CardFace.tsx';
import { describeFace } from './faces.ts';
import './Card.css';

export const cardStates = { closed: 'closed', revealed: 'revealed', matched: 'matched' } as const;
export type CardAppearance =
  | { readonly kind: typeof cardStates.closed }
  | { readonly kind: typeof cardStates.revealed | typeof cardStates.matched; readonly faceId: number };
export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly appearance: CardAppearance;
  readonly tabIndex: number;
  readonly blocked: boolean;
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly onFocus: (button: HTMLButtonElement) => void;
  readonly onActivate: () => void;
}

export function Card({ index, size, appearance, tabIndex, blocked, buttonRef, onFocus, onActivate }: CardProps) {
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = appearance.kind === cardStates.closed ? `${position}, closed`
    : `${position}, ${describeFace(appearance.faceId).name}, ${appearance.kind}`;
  return <button type="button" ref={buttonRef} className={`card card-${appearance.kind}`}
    tabIndex={tabIndex} aria-label={name} aria-disabled={blocked || appearance.kind === cardStates.matched}
    onFocus={event => onFocus(event.currentTarget)}
    onClick={event => {
      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate();
    }}>
    {appearance.kind === cardStates.closed
      ? <svg className="card-back" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path d="m50 36 14 14-14 14-14-14Z" />
        </svg>
      : <CardFace faceId={appearance.faceId} />}
    {appearance.kind === cardStates.matched && <span className="card-check" aria-hidden="true">✓</span>}
  </button>;
}
