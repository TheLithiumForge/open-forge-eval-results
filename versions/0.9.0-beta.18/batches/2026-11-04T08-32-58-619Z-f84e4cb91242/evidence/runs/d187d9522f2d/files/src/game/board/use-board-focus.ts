import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

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
    card?.focus({ preventScroll: true, focusVisible: true });
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

  const boardKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !element.current?.contains(target)) return;
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'ArrowDown'
      )
        return;

      event.preventDefault();
      const index = focused;
      const row = Math.floor(index / size);
      const column = index % size;
      let destination = index;
      switch (event.key) {
        case 'ArrowLeft':
          if (column > 0) destination -= 1;
          break;
        case 'ArrowRight':
          if (column < size - 1) destination += 1;
          break;
        case 'ArrowUp':
          if (row > 0) destination -= size;
          break;
        case 'ArrowDown':
          if (row < size - 1) destination += size;
          break;
      }
      if (destination === index) return;
      element.current?.querySelectorAll('button').item(destination).focus({
        preventScroll: true,
        focusVisible: true,
      });
    },
    [focused, size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, boardKeyDown };
}
