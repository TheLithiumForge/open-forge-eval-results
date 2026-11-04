import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';

// Keeps the board's remembered tab stop and scrolls keyboard focus into view with nearest
// alignment.
export function useBoardFocus() {
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
  const moveWithArrow = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, size: number): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      let destination: number;
      switch (event.key) {
        case 'ArrowLeft':
          destination = focused % size === 0 ? focused : focused - 1;
          break;
        case 'ArrowRight':
          destination = focused % size === size - 1 ? focused : focused + 1;
          break;
        case 'ArrowUp':
          destination = focused < size ? focused : focused - size;
          break;
        case 'ArrowDown':
          destination = focused >= size * (size - 1) ? focused : focused + size;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (destination === focused) return;
      const card = element.current?.querySelectorAll('button').item(destination);
      card?.focus({ preventScroll: true });
      if (card) scrollToNearest(card);
    },
    [element, focused, scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, moveWithArrow };
}
