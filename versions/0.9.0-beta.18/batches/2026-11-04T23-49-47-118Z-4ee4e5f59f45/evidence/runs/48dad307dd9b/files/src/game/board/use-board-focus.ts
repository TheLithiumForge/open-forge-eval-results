import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';

// Keeps the board's remembered tab stop and scrolls keyboard focus into view with nearest
// alignment.
export function useBoardFocus(size: number) {
  const viewport = useRef<HTMLDivElement>(null);
  const element = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(0);
  const scrollToNearest = useNearestScroll(viewport);
  // Focus calls skip the browser's centering scroll and then scroll with nearest alignment.
  const focusRemembered = useCallback(() => {
    const card = element.current?.querySelectorAll('button').item(focused);
    card?.focus({ preventScroll: true });
    if (card) scrollToNearest(card);
  }, [focused, scrollToNearest]);
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  const navigate = useCallback(
    (index: number, key: string): boolean => {
      const row = Math.floor(index / size);
      const column = index % size;
      let nextRow = row;
      let nextColumn = column;
      switch (key) {
        case 'ArrowUp':
          nextRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          nextRow = Math.min(size - 1, row + 1);
          break;
        case 'ArrowLeft':
          nextColumn = Math.max(0, column - 1);
          break;
        case 'ArrowRight':
          nextColumn = Math.min(size - 1, column + 1);
          break;
        default:
          return false;
      }
      const nextIndex = nextRow * size + nextColumn;
      if (nextIndex !== index) element.current?.querySelectorAll('button').item(nextIndex)?.focus();
      return true;
    },
    [size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, navigate };
}
