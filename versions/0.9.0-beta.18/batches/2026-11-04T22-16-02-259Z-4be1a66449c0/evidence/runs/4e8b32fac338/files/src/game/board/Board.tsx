import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref, CSSProperties } from 'react';
import type { Game } from '../game';
import { Face, faceName } from './Face';
import './Board.css';
export type BoardHandle = { focus: () => void };
export function Board({ game, activate, boardRef }: { game: Game; activate: (index: number) => void; boardRef: Ref<BoardHandle> }) {
  const [tab, setTab] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useImperativeHandle(boardRef, () => ({ focus: () => buttons.current[tab]?.focus() }), [tab]);
  const size = game.board.size;
  const style: CSSProperties & Record<'--columns', number> = { gridTemplateColumns: `repeat(${size}, var(--card-size))`, '--columns': size };
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number) {
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
  return <div className="board-scroll"><div className="board" style={style} role="group" aria-label="Game board">
    {game.board.deck.map((face, index) => {
      const matched = game.matched.includes(index), s = game.selection;
      const revealed = matched || (s.kind === 'one' && s.index === index) || (s.kind === 'mismatch' && (s.first === index || s.second === index));
      const name = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}, ${revealed ? `${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : 'closed'}`;
      return <button key={index} ref={element => { buttons.current[index] = element; }} className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`} aria-label={name} aria-disabled={matched || undefined} tabIndex={tab === index ? 0 : -1} onFocus={event => { setTab(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={event => key(event, index)} onClick={event => { if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) activate(index); }}>
        {revealed ? <Face id={face}/> : <span className="back-diamond" aria-hidden="true"/>}{matched && <span className="check" aria-hidden="true">✓</span>}
      </button>;
    })}
  </div></div>;
}
