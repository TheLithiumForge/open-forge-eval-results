import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import { CardBack, FaceArtwork } from './FaceArtwork.tsx';
import type { FaceDescription } from './face.ts';

export interface BoardCardProps {
  readonly index: number;
  readonly size: number;
  readonly face: FaceDescription | null;
  readonly matched: boolean;
  readonly blocked: boolean;
  readonly tabStop: boolean;
  readonly onActivate: (index: number) => void;
  readonly onFocus: (index: number) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  readonly refCallback: (button: HTMLButtonElement | null) => void;
}

function positionName(index: number, size: number): string {
  const row = Math.floor(index / size) + 1;
  const column = (index % size) + 1;
  return 'Row ' + row + ', column ' + column;
}

function activateClick(event: MouseEvent<HTMLButtonElement>, index: number, activate: (index: number) => void): void {
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  activate(index);
}

export function BoardCard({
  index,
  size,
  face,
  matched,
  blocked,
  tabStop,
  onActivate,
  onFocus,
  onKeyDown,
  refCallback,
}: BoardCardProps): JSX.Element {
  const stateName = matched ? 'matched' : face === null ? 'closed' : 'revealed';
  const cardName = positionName(index, size) + (face === null ? ', closed' : ', ' + face.name + ', ' + stateName);
  return (
    <button
      ref={refCallback}
      className={matched ? 'game-card is-matched' : face === null ? 'game-card' : 'game-card is-revealed'}
      type="button"
      aria-label={cardName}
      aria-disabled={matched || blocked}
      tabIndex={tabStop ? 0 : -1}
      onClick={(event) => activateClick(event, index, onActivate)}
      onFocus={(event) => {
        onFocus(index);
        event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }}
      onKeyDown={(event) => onKeyDown(event, index)}
      data-card-index={index}
    >
      {face === null ? <CardBack /> : <FaceArtwork id={face.id} />}
      {matched && <span className="matched-check" aria-hidden="true">✓</span>}
    </button>
  );
}
