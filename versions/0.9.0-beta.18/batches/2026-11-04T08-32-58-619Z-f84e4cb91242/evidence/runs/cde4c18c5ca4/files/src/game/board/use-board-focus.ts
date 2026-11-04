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
  const cardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      let next = focused;
      switch (event.key) {
        case 'ArrowLeft':
          if (focused % size > 0) next = focused - 1;
          break;
        case 'ArrowRight':
          if (focused % size < size - 1) next = focused + 1;
          break;
        case 'ArrowUp':
          if (focused >= size) next = focused - size;
          break;
        case 'ArrowDown':
          if (focused < size * (size - 1)) next = focused + size;
          break;
        default:
          return;
      }
      event.preventDefault();
      const card = element.current?.querySelectorAll('button').item(next);
      card?.focus({ preventScroll: true });
    },
    [focused, size],
  );
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, cardKeyDown };
}
