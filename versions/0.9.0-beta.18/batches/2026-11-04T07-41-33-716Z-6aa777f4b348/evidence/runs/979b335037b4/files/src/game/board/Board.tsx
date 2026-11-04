import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import './Board.css';

export type BoardHandle = { focus: () => void };
export type BoardProps = { game: GameState; activate: (index: number) => void; ref: Ref<BoardHandle> };

export function Board({ game, activate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const size = game.board.size;
  const buttons = () => board.current?.querySelectorAll<HTMLButtonElement>('.card');
  useImperativeHandle(ref, () => ({ focus: () => buttons()?.[tabStop]?.focus() }), [tabStop]);

  function focus(index: number) {
    setTabStop(index);
    buttons()?.[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let next = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) next--; break;
      case 'ArrowRight': if (index % size < size - 1) next++; break;
      case 'ArrowUp': if (index >= size) next -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) next += size; break;
      default: return;
    }
    event.preventDefault();
    buttons()?.[next]?.focus();
  }

  const style: CSSProperties & { '--columns': number } = { '--columns': size };
  return <div className="board-scroll" ref={board} role="group" aria-label={`${size} by ${size} memory board`}>
    <div className="board-grid" style={style}>
      {game.board.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const selection = game.selection;
        const revealed = matched || (selection.kind === 'one' && selection.index === index) ||
          (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={size} face={face} matched={matched} revealed={revealed}
          tabStop={tabStop === index} activate={activate} onFocus={focus} onKeyDown={navigate} />;
      })}
    </div>
  </div>;
}
