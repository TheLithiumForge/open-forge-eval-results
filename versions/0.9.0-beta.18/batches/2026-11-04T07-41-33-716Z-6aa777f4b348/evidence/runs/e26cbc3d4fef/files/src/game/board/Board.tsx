import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import { isCardRevealed, selectionKinds } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { arrowDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
export interface BoardProps {
  readonly game: GameState;
  readonly blocked: boolean;
  readonly revision: number;
  readonly onActivate: (index: number) => void;
  readonly ref?: Ref<BoardHandle>;
}

export function Board({ game, blocked, revision, onActivate, ref }: BoardProps) {
  const [memory, setMemory] = useState({ revision, index: 0 });
  const cards = useRef(new Map<number, HTMLButtonElement>());
  const remembered = memory.revision === revision ? memory.index : 0;
  useImperativeHandle(ref, () => ({
    focusRemembered(): void { cards.current.get(remembered)?.focus(); },
  }), [remembered, revision]);

  function focus(index: number, button: HTMLButtonElement): void {
    setMemory({ revision, index });
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const next = arrowDestination(index, game.board.size, event.key);
    if (next === null) return;
    event.preventDefault();
    cards.current.get(next)?.focus();
  }

  const size = game.board.size;
  const style: CSSProperties = {
    gridTemplateColumns: `repeat(${size}, clamp(44px, calc((100cqw - ${(size - 1) * 6}px) / ${size}), 88px))`,
  };
  const activationBlocked = blocked || game.selection.kind === selectionKinds.mismatch;
  return (
    <div className="board-scroll" role="group" aria-label="Memory board">
      <div className="board-grid" style={style}>
        {game.deck.map((faceId, index) => (
          <Card key={index} index={index} size={size} faceId={faceId}
            revealed={isCardRevealed(game, index)} matched={game.matched.includes(index)}
            blocked={activationBlocked} tabIndex={remembered === index ? 0 : -1}
            buttonRef={(button) => {
              if (button) cards.current.set(index, button); else cards.current.delete(index);
            }}
            onActivate={onActivate} onFocus={focus} onKeyDown={navigate} />
        ))}
      </div>
    </div>
  );
}
