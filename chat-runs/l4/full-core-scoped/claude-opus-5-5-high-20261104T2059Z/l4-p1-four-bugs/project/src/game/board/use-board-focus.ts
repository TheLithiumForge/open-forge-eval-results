import { useCallback, useRef, useState } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';
import { arrowTarget } from './keyboard-movement.ts';
import type { KeyboardEvent } from 'react';

const KEYBOARD_FOCUS = ':focus-visible';

// Keeps the board's remembered tab stop and scrolls keyboard focus into view with nearest
// alignment.
export function useBoardFocus(size: number) {
  const viewport = useRef<HTMLDivElement>(null);
  const element = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(0);
  // Arrow keys move from the focused card even before React renders its new tab stop.
  const current = useRef(0);
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
  // Unmodified arrow keys move focus without activating a card. Other keys stay with the browser.
  const keyPressed = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = arrowTarget(event.key, current.current, size);
      if (target === null) return;
      event.preventDefault();
      focusCard(target);
    },
    [focusCard, size],
  );
  const cardFocused = useCallback(
    (index: number, card: HTMLElement): void => {
      current.current = index;
      setFocused(index);
      // Moving a card under a pressed pointer would send the release elsewhere and lose the click.
      if (card.matches(KEYBOARD_FOCUS)) scrollToNearest(card);
    },
    [scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, keyPressed };
}
