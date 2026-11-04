import './Board.css';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type { Game } from '../core.ts';
import { Face, faceName } from './Face.tsx';
export function Board({ game, generation, activate, boardRef }: { game: Game; generation: number; activate: (index: number) => void; boardRef: RefObject<HTMLDivElement | null> }) {
  const [focus, setFocus] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setFocus(0); }, [generation]);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const col = index % game.size; let next = index;
    if (event.key === 'ArrowLeft' && col > 0) next--;
    else if (event.key === 'ArrowRight' && col < game.size - 1) next++;
    else if (event.key === 'ArrowUp' && index >= game.size) next -= game.size;
    else if (event.key === 'ArrowDown' && index < game.deck.length - game.size) next += game.size;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); buttons.current[next]?.focus(); }
  };
  return <div className="board-scroll" ref={boardRef}><div className="board" style={{ '--columns': game.size } as CSSProperties} aria-label="Game board">
    {game.deck.map((face, index) => {
      const matched = game.matched.includes(index), s = game.selection;
      const revealed = matched || (s.kind === 'one' && s.index === index) || (s.kind === 'mismatch' && (s.first === index || s.second === index));
      const label = `Row ${Math.floor(index / game.size) + 1}, column ${index % game.size + 1}, ${revealed ? `${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : 'closed'}`;
      return <button key={index} ref={el => { buttons.current[index] = el; }} className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`} aria-label={label} aria-disabled={matched || undefined} tabIndex={focus === index ? 0 : -1} onFocus={e => { setFocus(index); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={e => move(e, index)} onClick={() => activate(index)}>{revealed ? <Face id={face}/> : <span className="diamond" aria-hidden="true">◇</span>}{matched && <span className="check" aria-hidden="true">✓</span>}</button>;
    })}
  </div></div>;
}
