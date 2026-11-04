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

function moveFocus(
  event: KeyboardEvent<HTMLDivElement>,
  size: number,
  focusCard: (index: number) => void,
): void {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  const card = target instanceof Element ? target.closest('button.card') : null;
  if (!(card instanceof HTMLButtonElement)) return;
  const index = [...event.currentTarget.querySelectorAll('button')].indexOf(card);
  if (index < 0) return;
  const row = Math.floor(index / size);
  const column = index % size;
  let next: number;
  switch (event.key) {
    case 'ArrowLeft':
      next = column > 0 ? index - 1 : index;
      break;
    case 'ArrowRight':
      next = column < size - 1 ? index + 1 : index;
      break;
    case 'ArrowUp':
      next = row > 0 ? index - size : index;
      break;
    case 'ArrowDown':
      next = row < size - 1 ? index + size : index;
      break;
    default:
      return;
  }
  event.preventDefault();
  focusCard(next);
}

export function Board({ game, ref, activate }: BoardProps) {
  const { size, deck, matched, selection } = game;
  const { viewport, element, focused, focusCard, focusRemembered, cardFocused } = useBoardFocus();
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
  const style: BoardStyle = { '--grid-size': size };
  return (
    <div
      ref={viewport}
      className="board-viewport"
      role="region"
      aria-label="Game board"
      aria-describedby="board-help"
    >
      <div
        className="board"
        ref={element}
        style={style}
        onKeyDown={(event) => moveFocus(event, size, focusCard)}
      >
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
