import { memo, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { Board as BoardDescription } from '../board.ts';
import { KIND } from '../state.ts';
import type { Selection } from '../state.ts';
import { Card } from './Card.tsx';
import './Board.css';

export type BoardHandle = { focusRemembered: () => void };
type Props = {
  board: BoardDescription; matched: readonly number[]; selection: Selection;
  onActivate: (index: number) => void; ref: Ref<BoardHandle>;
};

export const Board = memo(function Board({ board, matched, selection, onActivate, ref }: Props) {
  const [position, setPosition] = useState(0);
  const element = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ focusRemembered() {
    element.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  } }), []);
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(position / board.size);
    const column = position % board.size;
    let next = position;
    switch (event.key) {
      case 'ArrowLeft': if (column > 0) next--; break;
      case 'ArrowRight': if (column < board.size - 1) next++; break;
      case 'ArrowUp': if (row > 0) next -= board.size; break;
      case 'ArrowDown': if (row < board.size - 1) next += board.size; break;
      default: return;
    }
    event.preventDefault();
    element.current?.querySelectorAll<HTMLButtonElement>('.card')[next]?.focus();
  }
  const style: CSSProperties & { '--columns': number } = { '--columns': board.size };
  return <div className="board-scroll" aria-label="Board scroll area">
    <div className="board" role="group" aria-label={`Memory board, ${board.size} rows and ${board.size} columns`}
      ref={element} style={style} onKeyDown={navigate}>
      {board.deck.map((face, index) => {
        const revealed = selection.kind === KIND.one ? selection.index === index
          : selection.kind === KIND.mismatch && (selection.first === index || selection.second === index);
        return <Card key={index} index={index} size={board.size} face={face} revealed={revealed}
          matched={matched.includes(index)} tabStop={position === index} onFocus={setPosition} onActivate={onActivate} />;
      })}
    </div>
  </div>;
});
