import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type { Game } from '../game.ts';
import { Face, faceName } from './Face.tsx';
import './board.css';
export function Board({ game, deal, activate, boardRef }: { game: Game; deal: number; activate: (index: number) => void; boardRef: RefObject<HTMLDivElement | null> }) {
  const [focus, setFocus] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setFocus(0); }, [deal]);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let target = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % game.size > 0) target--; break;
      case 'ArrowRight': if (index % game.size < game.size - 1) target++; break;
      case 'ArrowUp': if (index >= game.size) target -= game.size; break;
      case 'ArrowDown': if (index < game.deck.length - game.size) target += game.size; break;
      default: return;
    }
    event.preventDefault(); buttons.current[target]?.focus();
  }
  return <div className="board-scroll" ref={boardRef}><div className="board" style={{ '--size': game.size } as CSSProperties} aria-label="Game board">{game.deck.map((face, index) => {
    const matched = game.matched.includes(index), s = game.selection;
    const revealed = matched || (s.kind === 'one' && s.index === index) || (s.kind === 'mismatch' && (s.first === index || s.second === index));
    const name = `Row ${Math.floor(index / game.size) + 1}, column ${index % game.size + 1}, ${revealed ? `${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : 'closed'}`;
    return <button key={index} ref={el => { buttons.current[index] = el; }} className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`} aria-label={name} aria-disabled={matched || undefined} tabIndex={focus === index ? 0 : -1} onFocus={event => { setFocus(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={event => move(event, index)} onClick={() => activate(index)}>{revealed ? <Face id={face}/> : <span className="back-diamond" aria-hidden="true"/>}{matched && <span className="check" aria-hidden="true">✓</span>}</button>;
  })}</div></div>;
}
