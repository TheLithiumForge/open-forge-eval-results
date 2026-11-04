import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';
// Column and row steps for each arrow key.
const ARROWS = new Map<string, readonly [number, number]>([
  ['ArrowLeft', [-1, 0]],
  ['ArrowRight', [1, 0]],
  ['ArrowUp', [0, -1]],
  ['ArrowDown', [0, 1]],
]);

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
  // Arrow keys move to the neighboring card and stop at the board edges. Other keys, and arrows
  // with a modifier, stay with the browser.
  const arrowPressed = useCallback(
    (event: KeyboardEvent<HTMLElement>, size: number): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const step = ARROWS.get(event.key);
      if (!step) return;
      event.preventDefault();
      const [columns, rows] = step;
      const column = (focused % size) + columns;
      const row = Math.floor(focused / size) + rows;
      if (column < 0 || column >= size || row < 0 || row >= size) return;
      const card = element.current?.querySelectorAll('button').item(row * size + column);
      card?.focus({ preventScroll: true });
    },
    [focused, element],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, arrowPressed };
}
