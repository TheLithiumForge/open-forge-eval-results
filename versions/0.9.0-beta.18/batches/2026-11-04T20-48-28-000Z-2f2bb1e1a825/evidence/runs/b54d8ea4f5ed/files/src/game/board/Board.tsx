import { useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { faceUpCards } from '../game.ts';
import { Card } from './Card.tsx';
import { useBoardFocus } from './use-board-focus.ts';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type { GameState } from '../game.ts';
import './board.css';

interface BoardProps {
  game: GameState;
  ref: RefObject<BoardFocus | null>;
  activate(index: number): void;
}
const NEAREST: ScrollIntoViewOptions = { block: 'nearest', inline: 'nearest' };
interface BoardStyle extends CSSProperties {
  '--grid-size': number;
}

export interface BoardFocus {
  focusRemembered(): void;
}

// Once a click or tap completes, the focused card can move fully into view.
function cardClicked(card: HTMLElement): void {
  card.scrollIntoView(NEAREST);
}

// Offsets of the destination card for each movement key, as [row, column].
const ARROW_STEPS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
};

export function Board({ game, ref, activate }: BoardProps) {
  const { size, deck, matched, selection } = game;
  const { viewport, element, focused, focusRemembered, cardFocused } = useBoardFocus();
  useImperativeHandle(ref, () => ({ focusRemembered }), [focusRemembered]);
  // A clock tick keeps both arrays, so the cards' props stay equal and no card renders again.
  const faceUp = useMemo(() => faceUpCards({ matched, selection }), [matched, selection]);
  const matchedCards = useMemo(() => new Set(matched), [matched]);
  // The game passes a new handler on each render. Cards keep one callback that calls the latest.
  const latestActivate = useRef(activate);
  useLayoutEffect(() => {
    latestActivate.current = activate;
  });
  const activateCard = useCallback((index: number) => latestActivate.current(index), []);
  function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
    const step = Object.hasOwn(ARROW_STEPS, event.key) ? ARROW_STEPS[event.key] : undefined;
    if (!step || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    const cards = Array.from(element.current?.querySelectorAll('button') ?? []);
    const from = cards.findIndex((card) => card === event.target);
    if (from < 0) return;
    event.preventDefault();
    const row = Math.floor(from / size) + step[0];
    const column = (from % size) + step[1];
    // Movement stops at the board edge.
    if (row < 0 || row >= size || column < 0 || column >= size) return;
    cards[row * size + column]?.focus({ preventScroll: true });
  }
  const style: BoardStyle = { '--grid-size': size };
  return (
    <div
      ref={viewport}
      className="board-viewport"
      role="region"
      aria-label="Game board"
      aria-describedby="board-help"
    >
      <div className="board" ref={element} style={style} onKeyDown={moveFocus}>
        {deck.map((face, index) => (
          <Card
            key={index}
            index={index}
            size={size}
            face={faceUp.has(index) ? face : null}
            matched={matchedCards.has(index)}
            tabIndex={focused === index ? 0 : -1}
            activate={activateCard}
            focus={cardFocused}
            clicked={cardClicked}
          />
        ))}
      </div>
    </div>
  );
}
