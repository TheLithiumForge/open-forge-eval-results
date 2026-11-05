import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';
import type { KeyboardEvent } from 'react';

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
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const cards = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('button.card'),
      );
      const index = cards.findIndex((card) => card === event.target);
      if (index < 0) return;
      const row = Math.floor(index / size);
      const column = index % size;
      let next = index;
      switch (event.key) {
        case 'ArrowLeft':
          if (column > 0) next -= 1;
          break;
        case 'ArrowRight':
          if (column < size - 1) next += 1;
          break;
        case 'ArrowUp':
          if (row > 0) next -= size;
          break;
        case 'ArrowDown':
          if (row < size - 1) next += size;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (next !== index) {
        cards[next]?.focus({ preventScroll: true });
      }
    },
    [size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, navigate };
}
