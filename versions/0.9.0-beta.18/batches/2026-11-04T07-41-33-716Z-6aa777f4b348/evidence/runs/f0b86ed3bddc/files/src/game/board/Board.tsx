import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import './Board.css';

export type BoardFocus = Readonly<{ focusRemembered(): void }>;
export type BoardProps = Readonly<{ game: GameState; onActivate(index: number): void; ref: Ref<BoardFocus> }>;
export function Board({ game, onActivate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ focusRemembered() {
    const card = grid.current?.children.item(tabStop);
    if (card instanceof HTMLButtonElement) card.focus();
  } }), [tabStop]);
  const size = game.board.size;
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    let next = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) next--; break;
      case 'ArrowRight': if (index % size < size - 1) next++; break;
      case 'ArrowUp': if (index >= size) next -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) next += size; break;
      default: return;
    }
    event.preventDefault();
    const destination = event.currentTarget.parentElement?.children.item(next);
    if (destination instanceof HTMLButtonElement) destination.focus();
  }
  return <div className="board-scroll" aria-label="Card board">
    <div ref={grid} className="board" role="group" aria-label={`${size} by ${size} memory board`}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`, minWidth: `${size * 44 + (size - 1) * 6}px` }}>
      {game.board.deck.map((face, index) => <Card key={index} index={index} size={size}
        face={isRevealed(game, index) ? face : undefined} matched={game.matched.includes(index)}
        tabStop={index === tabStop} onActivate={onActivate} onFocus={setTabStop} onKeyDown={navigate} />)}
    </div>
  </div>;
}
