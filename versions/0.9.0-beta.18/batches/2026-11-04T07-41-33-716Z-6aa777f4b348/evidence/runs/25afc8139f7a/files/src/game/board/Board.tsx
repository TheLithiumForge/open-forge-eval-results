import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type BoardProps = Readonly<{
  game: GameState;
  paused: boolean;
  activate: (index: number) => void;
  ref: Ref<BoardHandle>;
}>;

export function Board({ game, paused, activate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useImperativeHandle(ref, () => ({
    focusRemembered: () => buttons.current[remembered]?.focus(),
  }), [remembered]);
  const size = game.board.size;
  const style: CSSProperties & { '--columns': number } = { '--columns': size };

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = focusDestination(index, size, event.key);
    if (destination !== null) {
      event.preventDefault();
      buttons.current[destination]?.focus();
    }
  }

  function visible(index: number): boolean {
    if (game.matched.includes(index)) return true;
    switch (game.selection.kind) {
      case 'closed': return false;
      case 'one': return game.selection.index === index;
      case 'mismatch': return game.selection.first === index || game.selection.second === index;
    }
  }

  return <section aria-label="Game board" className="board-scroll" style={style}>
    <div className="board-grid">
      {game.board.deck.map((face, index) => <Card
        key={index} index={index} size={size} face={visible(index) ? face : null}
        matched={game.matched.includes(index)}
        blocked={paused || game.selection.kind === 'mismatch'} tabStop={remembered === index}
        buttonRef={(button) => { buttons.current[index] = button; }}
        onFocus={() => {
          setRemembered(index);
          buttons.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }}
        onKeyDown={(event) => keyDown(event, index)} activate={() => activate(index)}
      />)}
    </div>
  </section>;
}
