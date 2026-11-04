import { useRef, useState } from 'react';
import type { KeyboardEvent, RefObject, CSSProperties } from 'react';
import type { Game } from '../game.ts';
import { Face, faceName } from './Face.tsx';
import './board.css';
export function Board({ game, activate, boardRef }: { game: Game; activate: (index: number) => void; boardRef: RefObject<HTMLDivElement | null> }) {
  const [focus, setFocus] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const size = game.board.size;
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let target = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) target--; break;
      case 'ArrowRight': if (index % size < size - 1) target++; break;
      case 'ArrowUp': if (index >= size) target -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) target += size; break;
      default: return;
    }
    event.preventDefault(); buttons.current[target]?.focus();
  }
  return <div className="board-scroll" ref={boardRef}><div className="board" style={{ '--columns': size } as CSSProperties}>
    {game.board.deck.map((face, index) => {
      const matched = game.matched.includes(index), selection = game.selection;
      const revealed = matched || (selection.kind === 'one' && selection.index === index) || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
      const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
      return <button key={index} ref={el => { buttons.current[index] = el; }} type="button" className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`} tabIndex={index === focus ? 0 : -1} aria-disabled={matched || undefined} aria-label={revealed ? `${position}, ${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : `${position}, closed`} onFocus={event => { setFocus(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={event => move(event, index)} onClick={event => { if (event.detail === 0 && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return; activate(index); }}>
        {revealed ? <Face id={face} /> : <span className="back-diamond" aria-hidden="true" />}{matched && <span className="check" aria-hidden="true">✓</span>}
      </button>;
    })}
  </div></div>;
}
