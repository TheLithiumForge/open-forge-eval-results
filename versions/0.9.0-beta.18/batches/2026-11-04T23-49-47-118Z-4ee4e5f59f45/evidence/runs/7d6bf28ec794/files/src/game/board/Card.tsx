import { memo } from 'react';
import { Face } from './Face.tsx';
import { describeCard } from './card-state.ts';
import type { BoardDirection } from './use-board-focus.ts';
import './card.css';

interface CardProps {
  index: number;
  size: number;
  face: number | null;
  matched: boolean;
  tabIndex: number;
  activate(index: number): void;
  moveFocus(index: number, size: number, direction: BoardDirection): void;
  focus(index: number, card: HTMLElement): void;
  clicked(card: HTMLElement): void;
}

function arrowDirection(key: string): BoardDirection | null {
  switch (key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    default:
      return null;
  }
}

// Memoized, so a clock tick that changes no card renders none of them.
export const Card = memo(function Card({
  index,
  size,
  face,
  matched,
  tabIndex,
  activate,
  moveFocus,
  focus,
  clicked,
}: CardProps) {
  const { state, label } = describeCard(index, size, face, matched);
  // Chromium sends no click after a context menu, a long press or a touch scroll, so every click
  // activates.
  return (
    <button
      type="button"
      className={`card ${state}`}
      aria-label={label}
      aria-disabled={matched}
      tabIndex={tabIndex}
      onFocus={(event) => focus(index, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const direction = arrowDirection(event.key);
        if (direction === null) return;
        event.preventDefault();
        moveFocus(index, size, direction);
      }}
      onClick={(event) => {
        activate(index);
        clicked(event.currentTarget);
      }}
    >
      {face === null ? <span className="card-back" aria-hidden="true" /> : <Face face={face} />}
      {matched && (
        <svg className="matched-mark" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="m2 6 3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
});
