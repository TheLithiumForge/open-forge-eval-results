import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { focusDestination, type BoardDirection } from './focusDestination.ts';
import { BoardCard } from './BoardCard.tsx';
import './board.css';

export interface BoardFocusHandle {
  focusRemembered(): void;
}

interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
}

function BoardView({ game, paused, onActivate }: BoardProps, ref: Ref<BoardFocusHandle>) {
  const [remembered, setRemembered] = useState(0);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useImperativeHandle(ref, () => ({
    focusRemembered: () => cardRefs.current[remembered]?.focus()
  }), [remembered]);

  function moveFocus(index: number, direction: BoardDirection): void {
    const target = focusDestination(index, game.board.size, direction);
    cardRefs.current[target]?.focus();
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index, event.key);
        break;
      default:
        break;
    }
  }

  const tracks = `repeat(${game.board.size}, minmax(44px, min(88px, calc((100cqw - ${(game.board.size - 1) * 6}px) / ${game.board.size}))))`;
  return (
    <section className="board-shell" aria-labelledby="board-heading">
      <h2 className="visually-hidden" id="board-heading">Cards, {game.board.size} by {game.board.size}</h2>
      <div className="board-scroll-area">
        <div className="board-grid" style={{ gridTemplateColumns: tracks }}>
          {game.board.deck.map((faceId, index) => {
            const matched = game.matched.includes(index);
            const revealed = matched || game.selection.kind === 'one' && game.selection.index === index
              || game.selection.kind === 'mismatch' && (game.selection.first === index || game.selection.second === index);
            const row = Math.floor(index / game.board.size) + 1;
            const column = index % game.board.size + 1;
            return (
              <BoardCard
                key={index}
                ref={(node) => { cardRefs.current[index] = node; }}
                faceId={faceId}
                revealed={revealed}
                matched={matched}
                row={row}
                column={column}
                tabStop={remembered === index}
                onFocus={(event) => {
                  setRemembered(index);
                  event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }}
                onKeyDown={(event) => onCardKeyDown(event, index)}
                onActivate={() => { if (!paused) onActivate(index); }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const Board = forwardRef(BoardView);
