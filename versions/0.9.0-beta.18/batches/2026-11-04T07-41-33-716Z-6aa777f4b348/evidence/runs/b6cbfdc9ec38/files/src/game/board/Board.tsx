import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import type { CardState } from './Card.tsx';
import { focusDestination, isMovementKey } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
export interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly ref: Ref<BoardHandle>;
  readonly onActivate: (index: number) => void;
}

export function Board({ game, paused, ref, onActivate }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const cards = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({ focusRemembered: () => cards.current.get(remembered)?.focus() }), [remembered]);

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isMovementKey(event.key)) return;
    event.preventDefault();
    cards.current.get(focusDestination(index, game.board.size, event.key))?.focus();
  }

  function cardState(index: number): CardState {
    if (game.matched.includes(index)) return 'matched';
    switch (game.selection.kind) {
      case 'closed': return 'closed';
      case 'one': return game.selection.index === index ? 'revealed' : 'closed';
      case 'mismatch':
        return game.selection.first === index || game.selection.second === index ? 'revealed' : 'closed';
    }
  }

  return (
    <section aria-label="Card board" aria-describedby="board-help" className="board-section">
      <div className="board-scroll">
        <div className="board-grid" style={{ gridTemplateColumns: `repeat(${game.board.size}, minmax(44px, 88px))`,
          minWidth: game.board.size * 44 + (game.board.size - 1) * 6 }}>
          {game.deck.map((face, index) => (
            <Card key={index} index={index} size={game.board.size} face={face} state={cardState(index)}
              tabIndex={remembered === index ? 0 : -1} blocked={paused || game.selection.kind === 'mismatch'}
              ref={(button) => { if (button) cards.current.set(index, button); else cards.current.delete(index); }}
              onActivate={() => onActivate(index)} onKeyDown={(event) => move(event, index)}
              onFocus={() => {
                setRemembered(index);
                cards.current.get(index)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }} />
          ))}
        </div>
      </div>
      <p id="board-help" className="help board-help">Reveal two cards to find a pair. Use arrow keys to move, Enter or Space to reveal.</p>
    </section>
  );
}
