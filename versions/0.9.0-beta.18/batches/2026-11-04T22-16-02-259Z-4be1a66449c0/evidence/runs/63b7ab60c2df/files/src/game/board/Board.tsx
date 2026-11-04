import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type { Game } from '../game.ts';
import { Face, faceName } from './faces.tsx';
import './board.css';
type Props = { game: Game; generation: number; activate: (index: number) => void; boardRef: RefObject<HTMLDivElement | null> };
export function Board({ game, generation, activate, boardRef }: Props) {
  const [focus, setFocus] = useState(0); const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setFocus(0), [generation]);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(index / game.size), col = index % game.size; let next = index;
    switch (event.key) { case 'ArrowLeft': if (col > 0) next--; break; case 'ArrowRight': if (col < game.size - 1) next++; break; case 'ArrowUp': if (row > 0) next -= game.size; break; case 'ArrowDown': if (row < game.size - 1) next += game.size; break; default: return; }
    event.preventDefault(); buttons.current[next]?.focus();
  }
  return <div className="board-scroll" ref={boardRef}><div className="board" style={{ '--size': game.size } as CSSProperties}>
    {game.deck.map((face, index) => {
      const matched = game.matched.includes(index);
      const revealed = matched || (game.selection.kind === 'one' && game.selection.index === index) || (game.selection.kind === 'mismatch' && (game.selection.first === index || game.selection.second === index));
      const name = `Row ${Math.floor(index / game.size) + 1}, column ${index % game.size + 1}, ${revealed ? `${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : 'closed'}`;
      return <button key={index} ref={element => { buttons.current[index] = element; }} type="button" className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`} tabIndex={focus === index ? 0 : -1} aria-label={name} aria-disabled={matched || undefined} onClick={() => activate(index)} onKeyDown={event => move(event, index)} onFocus={event => { setFocus(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}>{revealed ? <Face id={face}/> : <span className="back-diamond" aria-hidden="true"/>}{matched && <span className="check" aria-hidden="true">✓</span>}</button>;
    })}
  </div></div>;
}
