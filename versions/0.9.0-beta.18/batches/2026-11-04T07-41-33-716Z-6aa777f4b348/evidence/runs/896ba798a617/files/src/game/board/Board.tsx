import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { moveFocus } from './navigation.ts';
import './Board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type BoardProps = Readonly<{
  game: GameState; paused: boolean; onActivate: (index: number) => void; ref?: Ref<BoardHandle>;
}>;
type BoardStyle = CSSProperties & Readonly<{ '--columns': number }>;

export function Board({ game, paused, onActivate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({
    focusRemembered() { board.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(); },
  }), []);
  function focus(index: number) {
    board.current?.querySelectorAll('button').item(index)?.focus();
  }
  function keyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = moveFocus(index, game.board.size, event.key);
    if (destination !== null) {
      event.preventDefault();
      focus(destination);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(index);
    }
  }
  const style: BoardStyle = { '--columns': game.board.size };
  return <div className="board-scroll" aria-label="Card board" role="group">
    <div className="board" ref={board} style={style}>
      {game.deck.map((face, index) => <Card key={index} index={index} size={game.board.size} face={face}
        revealed={isRevealed(game, index)} matched={game.matched.includes(index)}
        blocked={paused || game.selection.kind === 'mismatch'} tabStop={index === tabStop}
        onActivate={() => onActivate(index)} onKeyDown={(event) => keyDown(index, event)}
        onFocus={(button) => {
          setTabStop(index);
          button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }} />)}
    </div>
  </div>;
}
