import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered: () => void }
interface BoardProps { game: GameState; onActivate: (index: number) => void; ref: Ref<BoardHandle> }
interface GridStyle extends CSSProperties { '--size': number }

export function Board({ game, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const element = useRef<HTMLDivElement>(null);
  function focus(index: number) {
    element.current?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
  }
  useImperativeHandle(ref, () => ({ focusRemembered: () => focus(remembered) }), [remembered]);
  const style: GridStyle = { '--size': game.board.size };
  return <div className="board-scroll" ref={element} role="group" aria-label="Memory board"
    aria-describedby="board-help" onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      focus(focusDestination(remembered, game.board.size, event.key));
    }}>
    <div className="board-grid" style={style}>
      {game.deck.map((face, index) => <Card key={index} index={index} size={game.board.size}
        face={isRevealed(game, index) ? face : undefined} matched={game.matched.includes(index)}
        tabStop={remembered === index} onFocus={setRemembered} onActivate={onActivate} />)}
    </div>
  </div>;
}
