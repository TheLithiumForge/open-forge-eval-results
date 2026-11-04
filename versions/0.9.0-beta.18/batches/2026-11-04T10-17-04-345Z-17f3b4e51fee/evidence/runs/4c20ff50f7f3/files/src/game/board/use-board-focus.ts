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
  function cardKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let next = focused;
    switch (event.key) {
      case 'ArrowLeft':
        if (focused % size > 0) next -= 1;
        break;
      case 'ArrowRight':
        if (focused % size < size - 1) next += 1;
        break;
      case 'ArrowUp':
        if (focused >= size) next -= size;
        break;
      case 'ArrowDown':
        if (focused < size * (size - 1)) next += size;
        break;
      default:
        return;
    }
    // Arrows move focus, including stopping at an edge, instead of scrolling the page.
    event.preventDefault();
    element.current?.querySelectorAll('button').item(next)?.focus({ preventScroll: true });
  }
  return { viewport, element, focused, focusRemembered, cardFocused, cardKeyDown };
}
