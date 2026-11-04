import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';
export type BoardArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

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
  const moveFocus = useCallback((index: number, key: BoardArrowKey, size: number): void => {
    const row = Math.floor(index / size);
    const column = index % size;
    let destination = index;
    if (key === 'ArrowLeft' && column > 0) destination -= 1;
    else if (key === 'ArrowRight' && column < size - 1) destination += 1;
    else if (key === 'ArrowUp' && row > 0) destination -= size;
    else if (key === 'ArrowDown' && row < size - 1) destination += size;
    const card = element.current?.querySelectorAll('button').item(destination);
    card?.focus({ preventScroll: true });
    if (card) scrollToNearest(card);
  }, [scrollToNearest]);
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
