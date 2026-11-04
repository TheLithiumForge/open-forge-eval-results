import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type BoardProps = Readonly<{ game: GameState; activate: (index: number) => void; ref: Ref<BoardHandle> }>;

export function Board({ game, activate, ref }: BoardProps) {
  const [focus, setFocus] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current.get(focus)?.focus() }), [focus]);
  function navigate(index: number, event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = focusDestination(index, game.board.size, event.key);
    if (destination === null) return;
    event.preventDefault();
    buttons.current.get(destination)?.focus();
  }
  function isRevealed(index: number): boolean {
    if (game.matched.includes(index)) return true;
    switch (game.selection.kind) {
      case 'closed': return false;
      case 'one': return game.selection.index === index;
      case 'mismatch': return game.selection.first === index || game.selection.second === index;
    }
  }
  const size = game.board.size;
  return <div className="board-scroll" role="group" aria-label={`${size} by ${size} card board`}>
    <div className="card-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))`,
      minWidth: size * 44 + (size - 1) * 6, maxWidth: size * 88 + (size - 1) * 6 }}>
      {game.deck.map((face, index) => <Card key={index} index={index} size={size}
        face={isRevealed(index) ? face : null} matched={game.matched.includes(index)}
        tabIndex={focus === index ? 0 : -1} activate={() => activate(index)}
        buttonRef={button => { if (button) buttons.current.set(index, button); else buttons.current.delete(index); }}
        navigate={event => navigate(index, event)} remember={button => {
          setFocus(index);
          button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }} />)}
    </div>
  </div>;
}
