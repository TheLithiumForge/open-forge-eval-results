import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { CARD_APPEARANCE, Card } from './Card.tsx';
import type { CardAppearance } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type BoardProps = Readonly<{ game: GameState; onActivate: (index: number) => void; ref: Ref<BoardHandle> }>;

export function Board({ game, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const size = game.board.size;
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current[remembered]?.focus() }), [remembered]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = focusDestination(index, size, event.key);
    if (destination === null) return;
    event.preventDefault();
    buttons.current[destination]?.focus();
  };

  return (
    <div className="board-scroll" role="group" aria-label="Memory board" aria-describedby="board-help">
      <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))`,
        minWidth: size * 44 + (size - 1) * 6, maxWidth: size * 88 + (size - 1) * 6 }}>
        {game.board.deck.map((face, index) => {
          const matched = game.matched.includes(index);
          const appearance: CardAppearance = isRevealed(game, index)
            ? { kind: matched ? CARD_APPEARANCE.matched : CARD_APPEARANCE.revealed, face }
            : { kind: CARD_APPEARANCE.closed };
          return <Card key={index} appearance={appearance} index={index} size={size} tabStop={index === remembered}
            buttonRef={(element) => { buttons.current[index] = element; }} onActivate={onActivate}
            onFocus={(event) => {
              setRemembered(index);
              event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }} onKeyDown={(event) => move(event, index)} />;
        })}
      </div>
    </div>
  );
}
