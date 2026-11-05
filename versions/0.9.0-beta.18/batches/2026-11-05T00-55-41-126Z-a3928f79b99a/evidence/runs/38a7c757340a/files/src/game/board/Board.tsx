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

export function Board({ game, ref, activate }: BoardProps) {
  const { size, deck, matched, selection } = game;
  const { viewport, element, focused, focusCard, focusRemembered, cardFocused } =
    useBoardFocus();
  useImperativeHandle(ref, () => ({ focusRemembered }), [focusRemembered]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const row = Math.floor(focused / size);
      const column = focused % size;
      let destination = focused;
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
        default:
          return;
      }

      event.preventDefault();
      focusCard(destination);
    },
    [focusCard, focused, size],
  );
  // A clock tick keeps both arrays, so the cards' props stay equal and no card renders again.
  const faceUp = useMemo(() => faceUpCards({ matched, selection }), [matched, selection]);
  const matchedCards = useMemo(() => new Set(matched), [matched]);
  // The game passes a new handler on each render. Cards keep one callback that calls the latest.
  const latestActivate = useRef(activate);
  useLayoutEffect(() => {
    latestActivate.current = activate;
  });
  const activateCard = useCallback((index: number) => latestActivate.current(index), []);
  const style: BoardStyle = { '--grid-size': size };
  return (
    <div
      ref={viewport}
      className="board-viewport"
      role="region"
      aria-label="Game board"
      aria-describedby="board-help"
    >
      <div className="board" ref={element} style={style} onKeyDown={handleKeyDown}>
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
