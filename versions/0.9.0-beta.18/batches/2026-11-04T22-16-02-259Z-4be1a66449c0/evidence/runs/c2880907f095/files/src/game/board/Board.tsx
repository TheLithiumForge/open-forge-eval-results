import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { GameState } from '../types';
import { Card } from './Card';
import './Board.css';

export type BoardHandle = Readonly<{ focusTabStop: () => void }>;
type Props = Readonly<{ game: GameState; resetKey: number; onActivate: (index: number) => void }>;

export const Board = forwardRef<BoardHandle, Props>(function Board({ game, resetKey, onActivate }, ref) {
  const [remembered, setRemembered] = useState({ key: resetKey, index: 0 });
  const tabStop = remembered.key === resetKey ? remembered.index : 0;
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const size = game.board.size;

  useImperativeHandle(ref, () => ({ focusTabStop: () => buttons.current[tabStop]?.focus() }), [tabStop]);

  const setButton = (index: number, button: HTMLButtonElement | null) => { buttons.current[index] = button; };
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let destination = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) destination -= 1; break;
      case 'ArrowRight': if (index % size < size - 1) destination += 1; break;
      case 'ArrowUp': if (index >= size) destination -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) destination += size; break;
      default: return;
    }
    event.preventDefault();
    if (destination !== index) buttons.current[destination]?.focus();
  };

  return (
    <div className="board-scroll" role="group" aria-label="Game board">
      <div className="board-grid" style={{
        gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))`,
        maxWidth: `calc(${size * 88}px + ${(size - 1) * 6}px)`,
      }}>
        {game.board.deck.map((_face, index) => (
          <Card key={index} game={game} index={index} tabIndex={tabStop === index ? 0 : -1}
            onActivate={onActivate} onFocus={(index) => setRemembered({ key: resetKey, index })}
            onKeyDown={moveFocus} setButton={setButton} />
        ))}
      </div>
    </div>
  );
});
