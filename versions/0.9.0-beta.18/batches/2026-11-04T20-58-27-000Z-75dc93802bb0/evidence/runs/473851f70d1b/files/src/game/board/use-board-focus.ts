import { useCallback, useRef, useState } from 'react';
import { arrowDestination } from './board-keys.ts';
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
  // Arrow keys move focus between cards without activating one. Other keys stay with the browser.
  const moveFocus = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const cards = [...(element.current?.querySelectorAll('button') ?? [])];
      const index = cards.findIndex((card) => card === event.target);
      if (index < 0) return;
      const destination = arrowDestination(event, index, size);
      if (destination === null) return;
      event.preventDefault();
      // The focus handler scrolls the card with nearest alignment.
      cards[destination]?.focus({ preventScroll: true });
    },
    [size],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, moveFocus };
}
