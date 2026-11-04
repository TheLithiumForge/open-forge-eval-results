import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';
import type { KeyboardEvent } from 'react';

const KEYBOARD_FOCUS = ':focus-visible';
const ARROW_STEPS: ReadonlyMap<string, { row: number; column: number }> = new Map([
  ['ArrowLeft', { row: 0, column: -1 }],
  ['ArrowRight', { row: 0, column: 1 }],
  ['ArrowUp', { row: -1, column: 0 }],
  ['ArrowDown', { row: 1, column: 0 }],
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
  // Arrow keys move focus only. The card's focus handler remembers it and scrolls it into view.
  const keyPressed = useCallback((event: KeyboardEvent<HTMLElement>, size: number): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const step = ARROW_STEPS.get(event.key);
    const cards = element.current?.querySelectorAll('button');
    const current = event.target instanceof Element ? event.target.closest('button') : null;
    if (!step || !cards || !current) return;
    event.preventDefault();
    const from = Array.from(cards).indexOf(current);
    const row = Math.floor(from / size) + step.row;
    const column = (from % size) + step.column;
    if (row < 0 || column < 0 || row >= size || column >= size) return;
    cards.item(row * size + column).focus({ preventScroll: true });
  }, []);
  return { viewport, element, focused, focusRemembered, cardFocused, keyPressed };
}
