import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';
// Row and column steps for each arrow key.
const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

// Keeps the board's remembered tab stop and scrolls keyboard focus into view with nearest
// alignment. Arrow keys move focus one row or column and stop at the board edges.
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
  const arrowPressed = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      const step = ARROW_STEPS[event.key];
      if (!step || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const cards = element.current?.querySelectorAll('button');
      const from = [...(cards ?? [])].findIndex((card) => card === event.target);
      if (!cards || from < 0) return;
      event.preventDefault();
      const row = Math.min(Math.max(Math.floor(from / size) + step[0], 0), size - 1);
      const column = Math.min(Math.max((from % size) + step[1], 0), size - 1);
      const card = cards.item(row * size + column);
      if (card === event.target) return;
      card.focus({ preventScroll: true });
      scrollToNearest(card);
    },
    [size, scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, arrowPressed };
}
