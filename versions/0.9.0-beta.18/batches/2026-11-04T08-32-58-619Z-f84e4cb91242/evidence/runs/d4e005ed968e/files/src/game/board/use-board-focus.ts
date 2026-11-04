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
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const destination = arrowDestination(index, size, event.key);
      if (destination === null) return;
      event.preventDefault();
      if (destination === index) return;
      const card = element.current?.querySelectorAll('button').item(destination);
      card?.focus({ preventScroll: true });
      if (card) scrollToNearest(card);
    },
    [scrollToNearest, size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, cardKeyDown };
}

function arrowDestination(index: number, size: number, key: string): number | null {
  switch (key) {
    case 'ArrowLeft':
      return index % size > 0 ? index - 1 : index;
    case 'ArrowRight':
      return index % size < size - 1 ? index + 1 : index;
    case 'ArrowUp':
      return index >= size ? index - size : index;
    case 'ArrowDown':
      return index + size < size * size ? index + size : index;
    default:
      return null;
  }
}
