import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
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

export function Board({ game, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const focusCard = (index: number) => grid.current?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
  useImperativeHandle(ref, () => ({ focusRemembered: () => focusCard(remembered) }), [remembered]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = arrowDestination(remembered, game.board.size, event.key);
    if (destination === null) return;
    event.preventDefault();
    focusCard(destination);
  };
  const { size } = game.board;
  const selection = game.selection;
  return <div className="board-scroll">
    <div ref={grid} className="board-grid" role="group" aria-label={`${size} by ${size} memory board`}
      aria-describedby="board-help" onKeyDown={moveFocus} style={{
        gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
        width: `${size * 88 + (size - 1) * 6}px`, minWidth: `${size * 44 + (size - 1) * 6}px`,
      }}>
      {game.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = matched || (selection.kind === 'one' && selection.index === index)
          || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={size} face={revealed ? face : null}
          matched={matched} tabIndex={index === remembered ? 0 : -1} onActivate={() => onActivate(index)}
          onFocus={card => { setRemembered(index); card.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} />;
      })}
    </div>
  </div>;
}
