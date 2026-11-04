import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import { SELECTION } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
export interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
  readonly ref: Ref<BoardHandle>;
}
interface BoardStyle extends CSSProperties { '--columns': number }
export function Board({ game, paused, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current.get(remembered)?.focus() }), [remembered]);
  const style: BoardStyle = { '--columns': game.board.size };
  const shown = (index: number) => {
    switch (game.selection.kind) {
      case SELECTION.closed: return false;
      case SELECTION.one: return game.selection.index === index;
      case SELECTION.mismatch: return game.selection.first === index || game.selection.second === index;
    }
  };
  return <div className="board-scroll" role="group" aria-label="Card board" aria-describedby="board-help">
    <div className="board" style={style}>
      {game.board.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        return <Card key={index} index={index} size={game.board.size} face={matched || shown(index) ? face : null}
          matched={matched} blocked={paused || game.selection.kind === SELECTION.mismatch} tabStop={remembered === index}
          buttonRef={(button) => { if (button) buttons.current.set(index, button); else buttons.current.delete(index); }}
          onActivate={() => onActivate(index)} onFocus={() => {
            setRemembered(index);
            buttons.current.get(index)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }} onKeyDown={(event) => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const destination = focusDestination(index, game.board.size, event.key);
            if (destination === null) return;
            event.preventDefault();
            buttons.current.get(destination)?.focus();
          }} />;
      })}
    </div>
  </div>;
}
