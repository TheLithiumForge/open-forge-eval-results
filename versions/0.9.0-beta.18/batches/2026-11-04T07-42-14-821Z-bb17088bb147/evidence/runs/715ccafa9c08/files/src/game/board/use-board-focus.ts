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
  function keyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(focused / size);
    const column = focused % size;
    let next = focused;
    switch (event.key) {
      case 'ArrowLeft':
        next -= column > 0 ? 1 : 0;
        break;
      case 'ArrowRight':
        next += column < size - 1 ? 1 : 0;
        break;
      case 'ArrowUp':
        next -= row > 0 ? size : 0;
        break;
      case 'ArrowDown':
        next += row < size - 1 ? size : 0;
        break;
      default:
        return;
    }
    event.preventDefault();
    const card = element.current?.querySelectorAll('button').item(next);
    card?.focus({ preventScroll: true });
    if (card) scrollToNearest(card);
  }
  return { viewport, element, focused, focusRemembered, cardFocused, keyDown };
}
