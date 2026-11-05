import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';
const DIRECTIONS: Record<string, readonly [number, number]> = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
};

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
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const direction = DIRECTIONS[event.key];
      if (!direction || !(event.target instanceof HTMLButtonElement)) return;
      const cards = element.current?.querySelectorAll('button');
      if (!cards) return;
      const current = Array.from(cards).indexOf(event.target);
      if (current < 0) return;

      event.preventDefault();
      const row = Math.floor(current / size);
      const column = current % size;
      const nextRow = Math.max(0, Math.min(size - 1, row + direction[0]));
      const nextColumn = Math.max(0, Math.min(size - 1, column + direction[1]));
      if (nextRow !== row || nextColumn !== column)
        cards.item(nextRow * size + nextColumn)?.focus({ preventScroll: true });
    },
    [element, size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, cardKeyDown };
}
