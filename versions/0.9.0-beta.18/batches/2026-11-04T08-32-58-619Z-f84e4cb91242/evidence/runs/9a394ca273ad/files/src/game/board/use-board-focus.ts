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
  const moveFocus = useCallback(
    (index: number, event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const column = index % size;
      let next: number;
      switch (event.key) {
        case 'ArrowUp':
          next = index - size;
          break;
        case 'ArrowDown':
          next = index + size;
          break;
        case 'ArrowLeft':
          next = column > 0 ? index - 1 : index;
          break;
        case 'ArrowRight':
          next = column < size - 1 ? index + 1 : index;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (next < 0 || next >= size * size) return;
      element.current?.querySelectorAll('button').item(next)?.focus({ preventScroll: true });
    },
    [size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, moveFocus };
}
