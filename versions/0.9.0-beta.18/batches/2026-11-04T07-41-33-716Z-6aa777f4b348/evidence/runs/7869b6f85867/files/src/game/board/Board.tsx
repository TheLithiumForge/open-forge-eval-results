import { useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { moveFocus } from './navigation.ts';
import './Board.css';

interface BoardProps {
  game: GameState; activate: (index: number) => void;
  focusBoard: RefObject<(() => void) | null>;
}

export function Board({ game, activate, focusBoard }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const focus = (index: number) => grid.current?.querySelectorAll('button')[index]?.focus({ preventScroll: true });
  focusBoard.current = () => focus(tabStop);
  const onFocus = (index: number) => {
    setTabStop(index);
    grid.current?.querySelectorAll('button')[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      focus(moveFocus(index, game.board.size, event.key));
    }
  };
  return <section aria-label="Card board" className="board-scroll">
    <div ref={grid} className="board" style={{ gridTemplateColumns: `repeat(${game.board.size}, minmax(44px, 88px))` }}>
      {game.board.deck.map((face, index) => <Card key={index} index={index} size={game.board.size}
        face={isRevealed(game, index) ? face : undefined} matched={game.matched.includes(index)}
        tabStop={tabStop === index} onActivate={activate} onFocus={onFocus} onKeyDown={onKeyDown} />)}
    </div>
  </section>;
}
