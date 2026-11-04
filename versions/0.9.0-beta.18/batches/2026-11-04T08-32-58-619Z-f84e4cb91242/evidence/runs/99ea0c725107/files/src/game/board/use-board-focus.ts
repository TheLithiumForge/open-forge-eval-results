import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNearestScroll } from './nearest-scroll.ts';

const KEYBOARD_FOCUS = ':focus-visible';

function destination(index: number, size: number, key: string): number | undefined {
  const column = index % size;
  switch (key) {
    case 'ArrowLeft':
      return column === 0 ? index : index - 1;
    case 'ArrowRight':
      return column === size - 1 ? index : index + 1;
    case 'ArrowUp':
      return index < size ? index : index - size;
    case 'ArrowDown':
      return index + size >= size * size ? index : index + size;
    default:
      return undefined;
  }
}

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
  const cardKeyDown = useCallback(
    (index: number, size: number, event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const next = destination(index, size, event.key);
      if (next === undefined) return;
      event.preventDefault();
      if (next !== index)
        element.current?.querySelectorAll('button').item(next)?.focus({ preventScroll: true });
    },
    [],
  );
  return { viewport, element, focused, focusRemembered, cardFocused, cardKeyDown };
}
