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
  const focusCard = useCallback(
    (index: number) => {
      const card = element.current?.querySelectorAll('button').item(index);
      card?.focus({ preventScroll: true });
      if (card) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  const focusRemembered = useCallback(() => focusCard(focused), [focused, focusCard]);
  const cardKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const column = index % size;
      let next: number;
      switch (event.key) {
        case 'ArrowLeft':
          next = column > 0 ? index - 1 : index;
          break;
        case 'ArrowRight':
          next = column < size - 1 ? index + 1 : index;
          break;
        case 'ArrowUp':
          next = index >= size ? index - size : index;
          break;
        case 'ArrowDown':
          next = index < size * (size - 1) ? index + size : index;
          break;
        default:
          return;
      }
      event.preventDefault();
      focusCard(next);
    },
    [size, focusCard],
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
