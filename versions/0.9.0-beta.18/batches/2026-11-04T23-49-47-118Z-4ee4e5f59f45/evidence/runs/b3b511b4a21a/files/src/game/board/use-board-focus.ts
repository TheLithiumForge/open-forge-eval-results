import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
  const cardKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLButtonElement>): void => {
      const row = Math.floor(index / size);
      const column = index % size;
      let next = index;
      switch (event.key) {
        case 'ArrowUp':
          if (row > 0) next -= size;
          break;
        case 'ArrowDown':
          if (row + 1 < size) next += size;
          break;
        case 'ArrowLeft':
          if (column > 0) next -= 1;
          break;
        case 'ArrowRight':
          if (column + 1 < size) next += 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (next !== index) element.current?.querySelectorAll('button').item(next)?.focus();
    },
    [size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, cardKeyDown };
}
