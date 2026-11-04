import './Board.css';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type { GameState } from '../state.ts';
import { Face, faceName } from './Face.tsx';
interface Props { game: GameState; generation: number; onActivate: (index: number) => void; boardRef: RefObject<HTMLDivElement | null> }
export function Board({ game, generation, onActivate, boardRef }: Props) {
  const [focus, setFocus] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setFocus(0); }, [generation]);
  const size = game.board.size;
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let next = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) next--; break;
      case 'ArrowRight': if (index % size < size - 1) next++; break;
      case 'ArrowUp': if (index >= size) next -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) next += size; break;
      default: return;
    }
    event.preventDefault(); buttons.current[next]?.focus();
  }
  return <div className="board-scroll" ref={boardRef}><div className="board" role="group" aria-label="Game board" style={{ '--columns': size } as CSSProperties}>
    {game.board.deck.map((face, index) => {
      const matched = game.matched.includes(index), selection = game.selection;
      const revealed = matched || (selection.kind === 'one' && selection.index === index) || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
      const state = matched ? 'matched' : revealed ? 'revealed' : 'closed';
      return <button key={index} ref={el => { buttons.current[index] = el; }} className={`card ${state}`} tabIndex={focus === index ? 0 : -1} aria-disabled={matched || undefined} aria-label={`Row ${Math.floor(index / size) + 1}, column ${index % size + 1}, ${revealed ? `${faceName(face)}, ${state}` : state}`} onFocus={e => { setFocus(index); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={e => move(e, index)} onClick={e => { if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) onActivate(index); }}>
        {revealed ? <Face id={face}/> : <span className="back-diamond" aria-hidden="true"/>}{matched && <span className="check" aria-hidden="true">✓</span>}
      </button>;
    })}
  </div></div>;
}
