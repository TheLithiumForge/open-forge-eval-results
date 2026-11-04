import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { keyboardDestination } from './keyboard-navigation.ts';
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
  const focusCard = useCallback(
    (index: number): void => {
      const card = element.current?.querySelectorAll('button').item(index);
      card?.focus({ preventScroll: true });
      if (card) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  const focusRemembered = useCallback(() => focusCard(focused), [focusCard, focused]);
  const moveFocus = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const destination = keyboardDestination(focused, size, event.key);
      if (destination === null) return;
      // Consume arrows even at an edge so the browser doesn't scroll away from the card.
      event.preventDefault();
      focusCard(destination);
    },
    [focusCard, focused, size],
  );
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, moveFocus };
}
