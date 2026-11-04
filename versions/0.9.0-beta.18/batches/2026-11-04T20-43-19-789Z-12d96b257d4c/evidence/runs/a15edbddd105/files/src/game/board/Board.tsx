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
  const { viewport, element, focused, focusRemembered, focusIndex, cardFocused } =
    useBoardFocus();
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
  function moveWithArrow(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const target = event.target instanceof Element ? event.target.closest('button.card') : null;
    if (!target) return;
    const index = Array.from(event.currentTarget.children).indexOf(target);
    if (index < 0) return;
    event.preventDefault();
    const row = Math.floor(index / size);
    const column = index % size;
    let next = index;
    if (event.key === 'ArrowLeft' && column > 0) next -= 1;
    if (event.key === 'ArrowRight' && column < size - 1) next += 1;
    if (event.key === 'ArrowUp' && row > 0) next -= size;
    if (event.key === 'ArrowDown' && row < size - 1) next += size;
    if (next !== index) focusIndex(next);
  }
  return (
    <div
      ref={viewport}
      className="board-viewport"
      role="region"
      aria-label="Game board"
      aria-describedby="board-help"
    >
      <div className="board" ref={element} style={style} onKeyDown={moveWithArrow}>
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
