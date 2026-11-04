import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { revealFocus } from './focus.ts';
import { arrowDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { readonly focusRemembered: () => void }
interface BoardProps {
  readonly game: GameState;
  readonly onActivate: (index: number) => void;
  readonly ref?: Ref<BoardHandle>;
}

export function Board({ game, onActivate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const area = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => ({ focusRemembered: () => cards.current[tabStop]?.focus() }), [tabStop]);
  const focus = (index: number, card: HTMLButtonElement) => {
    setTabStop(index);
    if (area.current) revealFocus(card, area.current);
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const next = arrowDestination(index, game.board.size, event.key);
    if (next === null) return;
    event.preventDefault();
    cards.current[next]?.focus({ preventScroll: true });
  };
  const { size } = game.board;
  const selection = game.selection;
  return <div className="board-scroll" ref={area}>
    <div className="board-grid" role="group" aria-label={`${size} by ${size} card board`}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        minWidth: size * 44 + (size - 1) * 6, maxWidth: size * 88 + (size - 1) * 6 }}>
      {game.board.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = matched || (selection.kind === 'one' && selection.index === index)
          || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={size} face={revealed ? face : null}
          matched={matched} tabStop={index === tabStop} buttonRef={card => { cards.current[index] = card; }}
          onFocus={focus} onKeyDown={move} onActivate={onActivate} />;
      })}
    </div>
  </div>;
}
