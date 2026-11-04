import { useCallback, useRef, useState } from 'react';
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
  const moveFocus = useCallback(
    (index: number, size: number, event: Pick<KeyboardEvent, 'key' | 'preventDefault'>): void => {
      const row = Math.floor(index / size);
      let next: number;
      switch (event.key) {
        case 'ArrowLeft':
          next = Math.max(row * size, index - 1);
          break;
        case 'ArrowRight':
          next = Math.min(row * size + size - 1, index + 1);
          break;
        case 'ArrowUp':
          next = row === 0 ? index : index - size;
          break;
        case 'ArrowDown':
          next = row === size - 1 ? index : index + size;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (next === index) return;
      const card = element.current?.querySelectorAll('button').item(next);
      card?.focus({ preventScroll: true });
      if (card) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, moveFocus };
}
