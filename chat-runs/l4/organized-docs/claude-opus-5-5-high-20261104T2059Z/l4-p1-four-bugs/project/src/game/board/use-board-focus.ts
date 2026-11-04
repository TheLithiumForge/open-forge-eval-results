import { useCallback, useRef, useState } from 'react';
import { movedCard } from './board-keys.ts';
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
  const keyPressed = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      const cards = element.current?.querySelectorAll('button');
      if (!cards) return;
      const from = [...cards].findIndex((card) => card === event.target);
      if (from < 0) return;
      const to = movedCard(from, size, event);
      if (to === null) return;
      // The board's scroll area would otherwise scroll on the same key.
      event.preventDefault();
      if (to === from) return;
      const card = cards.item(to);
      card.focus({ preventScroll: true });
      scrollToNearest(card);
    },
    [size, scrollToNearest],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, keyPressed };
}
