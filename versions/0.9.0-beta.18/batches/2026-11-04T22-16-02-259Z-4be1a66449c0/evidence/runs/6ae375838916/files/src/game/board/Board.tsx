import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type { Game } from '../game.ts';
import { Face, faceName } from './Face.tsx';
import './board.css';
type Props = { game: Game; deal: number; activate: (index: number) => void; boardRef: RefObject<HTMLDivElement | null> };
export function Board({ game, deal, activate, boardRef }: Props) {
  const [focus, setFocus] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setFocus(0); }, [deal]);
  const size = game.board.size;
  const style: CSSProperties & { '--size': number } = { '--size': size };
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
    event.preventDefault(); buttons.current[next]?.focus();
  }
  return <div className="board-scroll" ref={boardRef} aria-label="Game board">
    <div className="board" style={style}>
      {game.board.deck.map((id, index) => {
        const matched = game.matched.includes(index), s = game.selection;
        const revealed = matched || (s.kind === 'one' && s.index === index) || (s.kind === 'mismatch' && (s.first === index || s.second === index));
        const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
        return <button key={index} ref={el => { buttons.current[index] = el; }} type="button" className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`}
          aria-label={revealed ? `${position}, ${faceName(id)}, ${matched ? 'matched' : 'revealed'}` : `${position}, closed`}
          aria-disabled={matched ? 'true' : undefined} tabIndex={focus === index ? 0 : -1}
          onFocus={event => { setFocus(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
          onKeyDown={event => navigate(event, index)} onClick={event => { if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && (event.detail === 0 || event.button === 0)) activate(index); }}>
          {revealed ? <Face id={id}/> : <span className="back-diamond" aria-hidden="true"/>}{matched && <span className="check" aria-hidden="true">✓</span>}
        </button>;
      })}
    </div>
  </div>;
}
