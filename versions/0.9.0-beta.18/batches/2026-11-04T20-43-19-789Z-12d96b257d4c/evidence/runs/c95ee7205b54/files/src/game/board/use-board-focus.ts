import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';
import type { KeyboardEvent } from 'react';

const KEYBOARD_FOCUS = ':focus-visible';

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
  function moveFocus(event: KeyboardEvent<HTMLDivElement>, size: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const cards = event.currentTarget.querySelectorAll('button');
    const index = Array.from(cards).findIndex((card) => card === event.target);
    if (index < 0) return;
    let destination = index;
    switch (event.key) {
      case 'ArrowLeft':
        if (index % size > 0) destination -= 1;
        break;
      case 'ArrowRight':
        if (index % size < size - 1) destination += 1;
        break;
      case 'ArrowUp':
        if (index >= size) destination -= size;
        break;
      case 'ArrowDown':
        if (index + size < cards.length) destination += size;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (destination !== index) cards.item(destination)?.focus({ preventScroll: true });
  }
  return { viewport, element, focused, focusRemembered, cardFocused, moveFocus };
}
