import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import './board.css';

export type BoardHandle = { focus: () => void };
type BoardProps = { game: GameState; activate: (index: number) => void; ref: Ref<BoardHandle> };

export function Board({ game, activate, ref }: BoardProps) {
  const [tabStop, remember] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const { size, deck } = game.board;
  const focus = (index: number) => grid.current?.querySelectorAll('button')[index]?.focus();
  useImperativeHandle(ref, () => ({ focus: () => focus(tabStop) }), [tabStop]);
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
      return;
    }
    const column = index % size;
    let destination = index;
    switch (event.key) {
      case 'ArrowLeft': if (column > 0) destination--; break;
      case 'ArrowRight': if (column < size - 1) destination++; break;
      case 'ArrowUp': if (index >= size) destination -= size; break;
      case 'ArrowDown': if (index < deck.length - size) destination += size; break;
      default: return;
    }
    event.preventDefault();
    focus(destination);
  };
  const selection = game.selection;
  return <div className="board-scroll" role="group" aria-label={`${size} by ${size} card board`}>
    <div className="board" ref={grid} style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
      width: `max(100%, ${size * 44 + (size - 1) * 6}px)`, maxWidth: `${size * 88 + (size - 1) * 6}px` }}>
      {deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = matched || (selection.kind === 'one' && selection.index === index)
          || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={size} face={revealed ? face : undefined}
          matched={matched} tabStop={tabStop === index} activate={activate} remember={remember} navigate={navigate} />;
      })}
    </div>
  </div>;
}
