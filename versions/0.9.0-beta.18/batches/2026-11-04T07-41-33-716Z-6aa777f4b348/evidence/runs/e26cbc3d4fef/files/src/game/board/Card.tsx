import type { KeyboardEvent, Ref } from 'react';
import { CardBack, FaceSvg } from './FaceSvg.tsx';
import { faceName } from './faces.ts';
import './Card.css';

export interface CardProps {
  readonly index: number;
  readonly size: number;
  readonly faceId: number;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly blocked: boolean;
  readonly tabIndex: 0 | -1;
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly onActivate: (index: number) => void;
  readonly onFocus: (index: number, button: HTMLButtonElement) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

export function Card(props: CardProps) {
  const { index, size, faceId, revealed, matched, blocked } = props;
  const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
  const name = revealed ? `${position}, ${faceName(faceId)}, ${matched ? 'matched' : 'revealed'}`
    : `${position}, closed`;
  const className = `card${revealed ? ' card--revealed' : ''}${matched ? ' card--matched' : ''}`;
  return (
    <button type="button" className={className} ref={props.buttonRef}
      aria-label={name} aria-disabled={matched || blocked} tabIndex={props.tabIndex}
      onFocus={(event) => props.onFocus(index, event.currentTarget)}
      onKeyDown={(event) => props.onKeyDown(event, index)}
      onClick={(event) => {
        if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
          || blocked || matched) return;
        props.onActivate(index);
      }}>
      {revealed ? <FaceSvg faceId={faceId} /> : <CardBack />}
      {matched && <span className="card-check" aria-hidden="true">✓</span>}
    </button>
  );
}
