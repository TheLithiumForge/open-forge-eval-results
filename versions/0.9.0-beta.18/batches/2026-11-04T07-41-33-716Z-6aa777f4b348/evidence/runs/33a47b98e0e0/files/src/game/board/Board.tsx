import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react';
import type { GameState } from '../state.ts';
import { BoardCard } from './BoardCard.tsx';
import { describeFace } from './face.ts';
import { nextBoardFocus } from './focus.ts';
import './board.css';

export interface BoardFocusHandle {
  focusRememberedCard(): void;
}

export interface BoardProps {
  readonly game: GameState;
  readonly dealId: number;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
}

export const Board = forwardRef<BoardFocusHandle, BoardProps>(function Board(
  { game, dealId, paused, onActivate },
  ref,
) {
  const size = game.board.size;
  const [tabStop, setTabStop] = useState(0);
  const tabStopRef = useRef(tabStop);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const matched = new Set(game.matched);

  useEffect(() => {
    tabStopRef.current = 0;
    setTabStop(0);
  }, [dealId]);


  useImperativeHandle(ref, () => ({
    focusRememberedCard() {
      buttons.current.get(tabStopRef.current)?.focus();
    },
  }), []);

  const rememberFocus = (index: number): void => {
    tabStopRef.current = index;
    setTabStop(index);
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = nextBoardFocus(index, size, event.key);
    if (destination === null) return;
    event.preventDefault();
    buttons.current.get(destination)?.focus();
  };

  const columns = 'repeat(' + size + ', clamp(44px, calc((100cqw - ' + ((size - 1) * 6) + 'px) / ' + size + '), 88px))';
  return (
    <section className="board-section" aria-label={size + ' by ' + size + ' card board'}>
      <p className="board-hint">Use the arrow keys to move. Enter or Space reveals a card.</p>
      <div className="board-scroll">
        <div className="card-grid" style={{ gridTemplateColumns: columns }}>
          {game.deck.map((faceId, index) => {
            const isMatched = matched.has(index);
            let visible = isMatched;
            switch (game.selection.kind) {
              case 'closed':
                break;
              case 'one':
                visible = visible || game.selection.index === index;
                break;
              case 'mismatch':
                visible = visible || game.selection.first === index || game.selection.second === index;
                break;
            }
            const blocked = paused || isMatched || game.selection.kind === 'mismatch';
            return (
              <BoardCard
                key={index}
                index={index}
                size={size}
                face={visible ? describeFace(faceId) : null}
                matched={isMatched}
                blocked={blocked}
                tabStop={tabStop === index}
                onActivate={onActivate}
                onFocus={rememberFocus}
                onKeyDown={moveFocus}
                refCallback={(button) => {
                  if (button === null) buttons.current.delete(index);
                  else buttons.current.set(index, button);
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
});
