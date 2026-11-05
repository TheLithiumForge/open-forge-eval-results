import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';
export type BoardDirection = 'left' | 'right' | 'up' | 'down';

function destination(index: number, size: number, direction: BoardDirection): number {
  switch (direction) {
    case 'left':
      return index % size === 0 ? index : index - 1;
    case 'right':
      return index % size === size - 1 ? index : index + 1;
    case 'up':
      return index < size ? index : index - size;
    case 'down':
      return index >= size * (size - 1) ? index : index + size;
  }
}

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
  const moveFocus = useCallback(
    (index: number, size: number, direction: BoardDirection) => {
      const next = destination(index, size, direction);
      if (next !== index)
        element.current?.querySelectorAll('button').item(next)?.focus({ preventScroll: true });
    },
    [],
  );
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, moveFocus, cardFocused };
}
