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
  const boardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const card = event.target;
      if (!(card instanceof HTMLButtonElement)) return;
      const cards = element.current?.querySelectorAll('button');
      if (!cards) return;
      const index = [...cards].indexOf(card);
      if (index < 0) return;

      let next = index;
      switch (event.key) {
        case 'ArrowLeft':
          next = Math.max(Math.floor(index / size) * size, index - 1);
          break;
        case 'ArrowRight':
          next = Math.min(Math.floor(index / size) * size + size - 1, index + 1);
          break;
        case 'ArrowUp':
          next = Math.max(0, index - size);
          break;
        case 'ArrowDown':
          next = Math.min(size * size - 1, index + size);
          break;
        default:
          return;
      }

      event.preventDefault();
      if (next !== index) cards.item(next)?.focus({ preventScroll: true });
    },
    [size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, boardKeyDown };
}
