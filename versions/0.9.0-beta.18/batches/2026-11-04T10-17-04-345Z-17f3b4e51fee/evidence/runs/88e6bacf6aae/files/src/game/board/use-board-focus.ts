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
    (index: number): void => {
      const card = element.current?.querySelectorAll('button').item(index);
      card?.focus({ preventScroll: true });
      if (card) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  const focusRemembered = useCallback(() => focusCard(focused), [focused, focusCard]);
  function boardKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let destination = focused;
    switch (event.key) {
      case 'ArrowLeft':
        if (focused % size > 0) destination -= 1;
        break;
      case 'ArrowRight':
        if (focused % size < size - 1) destination += 1;
        break;
      case 'ArrowUp':
        if (focused >= size) destination -= size;
        break;
      case 'ArrowDown':
        if (focused < size * (size - 1)) destination += size;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusCard(destination);
  }
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, boardKeyDown };
}
