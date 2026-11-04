import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { arrowDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
interface BoardProps {
  readonly game: GameState;
  readonly onActivate: (index: number) => void;
  readonly ref: Ref<BoardHandle>;
}
interface BoardStyle extends CSSProperties { readonly '--columns': number }

export function Board({ game, onActivate, ref }: BoardProps) {
  const [focused, setFocused] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({ focusRemembered() { buttons.current.get(focused)?.focus(); } }), [focused]);
  function focus(index: number): void {
    setFocused(index);
    buttons.current.get(index)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function keyDown(index: number, event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = arrowDestination(index, game.board.size, event.key);
    if (destination === null) return;
    event.preventDefault();
    buttons.current.get(destination)?.focus();
  }
  const style: BoardStyle = { '--columns': game.board.size };
  return <div className="board-scroll">
    <div className="board-grid" role="group" aria-label={`${game.board.size} by ${game.board.size} memory board`} style={style}>
      {game.deck.map((_, index) => <Card key={index} game={game} index={index}
        ref={(element) => { if (element) buttons.current.set(index, element); else buttons.current.delete(index); }}
        tabIndex={focused === index ? 0 : -1} onFocus={() => focus(index)}
        onActivate={() => onActivate(index)} onKeyDown={(event) => keyDown(index, event)} />)}
    </div>
  </div>;
}
