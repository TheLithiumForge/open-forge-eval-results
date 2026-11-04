import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';

function cardInDirection(index: number, size: number, key: string): number | null {
  const column = index % size;
  switch (key) {
    case 'ArrowLeft':
      return column === 0 ? index : index - 1;
    case 'ArrowRight':
      return column === size - 1 ? index : index + 1;
    case 'ArrowUp':
      return index < size ? index : index - size;
    case 'ArrowDown':
      return index + size >= size * size ? index : index + size;
    default:
      return null;
  }
}

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
  const moveCardFocus = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const buttons = element.current?.querySelectorAll('button');
      if (!buttons || !(event.target instanceof HTMLButtonElement)) return;
      const current = Array.from(buttons).indexOf(event.target);
      if (current < 0) return;
      const destination = cardInDirection(current, size, event.key);
      if (destination === null) return;
      event.preventDefault();
      if (destination !== current) buttons.item(destination)?.focus({ preventScroll: true });
    },
    [size],
  );
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, moveCardFocus, cardFocused };
}
