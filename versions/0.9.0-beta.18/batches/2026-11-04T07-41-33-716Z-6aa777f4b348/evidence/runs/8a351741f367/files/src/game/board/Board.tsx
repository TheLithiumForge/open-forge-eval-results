import { useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
interface BoardProps {
  readonly game: GameState;
  readonly onActivate: (index: number) => void;
  readonly ref: Ref<BoardHandle>;
}

export function Board({ game, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current[remembered]?.focus() }), [remembered]);
  const size = game.board.size;
  const selection = game.selection;
  return <div className="board-scroll" role="group" aria-label={`${size} by ${size} memory board`}>
    <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
      minWidth: size * 44 + (size - 1) * 6, maxWidth: size * 88 + (size - 1) * 6 }}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const destination = focusDestination(remembered, size, event.key);
        if (destination === null) return;
        event.preventDefault();
        buttons.current[destination]?.focus();
      }}>
      {game.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = matched || (selection.kind === 'one' && selection.index === index) ||
          (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={size} face={face} revealed={revealed} matched={matched}
          tabIndex={remembered === index ? 0 : -1} onFocus={setRemembered} onActivate={onActivate}
          buttonRef={(button) => { buttons.current[index] = button; }} />;
      })}
    </div>
  </div>;
}
