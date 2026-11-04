import { useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { nextCard } from './navigation.ts';
import './Board.css';

export interface BoardHandle {
  focusRemembered(): void;
}

export interface BoardProps {
  game: GameState;
  paused: boolean;
  onActivate: (index: number) => void;
  ref?: Ref<BoardHandle>;
}

export function Board({ game, paused, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const activation = useRef(onActivate);
  activation.current = onActivate;
  const activate = useCallback((index: number) => activation.current(index), []);
  useImperativeHandle(ref, () => ({
    focusRemembered: () => grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus(),
  }), []);
  const onFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const index = Number(event.target.dataset.position);
    if (!Number.isInteger(index)) return;
    setRemembered(index);
    event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!(event.target instanceof HTMLButtonElement)) return;
    const index = Number(event.target.dataset.position);
    const next = nextCard(index, game.board.size, event.key);
    if (next === null) return;
    event.preventDefault();
    grid.current?.querySelector<HTMLButtonElement>(`button[data-position="${next}"]`)?.focus();
  };
  const style: CSSProperties & { '--columns': number } = { '--columns': game.board.size };
  const selection = game.selection;
  return <div className="board-scroll" role="group" aria-label="Memory board">
    <div className="board-grid" ref={grid} style={style} onFocus={onFocus} onKeyDown={onKeyDown}>
      {game.board.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = matched || (selection.kind === 'one' && selection.index === index)
          || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={game.board.size} face={revealed ? face : null}
          matched={matched} blocked={paused || selection.kind === 'mismatch'}
          tabStop={remembered === index} onActivate={activate} />;
      })}
    </div>
  </div>;
}
