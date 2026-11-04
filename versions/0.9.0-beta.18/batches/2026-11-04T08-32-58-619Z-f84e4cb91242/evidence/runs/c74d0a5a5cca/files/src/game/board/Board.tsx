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

function isModified(event: KeyboardEvent<HTMLDivElement>): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

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
  function moveCardFocus(event: KeyboardEvent<HTMLDivElement>): void {
    if (isModified(event)) return;
    const column = focused % size;
    let destination: number;
    switch (event.key) {
      case 'ArrowLeft':
        destination = column === 0 ? focused : focused - 1;
        break;
      case 'ArrowRight':
        destination = column === size - 1 ? focused : focused + 1;
        break;
      case 'ArrowUp':
        destination = focused < size ? focused : focused - size;
        break;
      case 'ArrowDown':
        destination = focused >= deck.length - size ? focused : focused + size;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (destination === focused) return;
    element.current?.querySelectorAll('button').item(destination)?.focus({ preventScroll: true });
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
      <div className="board" ref={element} style={style} onKeyDown={moveCardFocus}>
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
