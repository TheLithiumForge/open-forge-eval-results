import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination, isMovementKey } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
export interface BoardProps {
  readonly game: GameState;
  readonly activate: (index: number) => void;
  readonly ref: Ref<BoardHandle>;
}
type BoardStyle = CSSProperties & { '--columns': number };

export function Board({ game, activate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({
    focusRemembered: () => buttons.current.get(remembered)?.focus({ preventScroll: true }),
  }), [remembered]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isMovementKey(event.key)) return;
    event.preventDefault();
    buttons.current.get(focusDestination(index, game.board.size, event.key))?.focus({ preventScroll: true });
  }
  const style: BoardStyle = { '--columns': game.board.size };
  return (
    <section className="board-scroll" aria-label="Card board">
      <div className="card-grid" style={style}>
        {game.deck.map((face, index) => {
          const matched = game.matched.includes(index);
          const selection = game.selection;
          const revealed = matched || (selection.kind === 'one' && selection.index === index)
            || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
          return <Card key={index} index={index} size={game.board.size} face={face} matched={matched}
            revealed={revealed} tabIndex={remembered === index ? 0 : -1}
            buttonRef={element => { if (element === null) buttons.current.delete(index); else buttons.current.set(index, element); }}
            onFocus={event => { setRemembered(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
            onKeyDown={event => navigate(event, index)} onActivate={() => activate(index)} />;
        })}
      </div>
    </section>
  );
}
