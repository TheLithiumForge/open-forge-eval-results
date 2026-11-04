import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { GameState } from '../state.ts';
import { Face, faceName } from './Face.tsx';
import './board.css';
export type BoardHandle = { focusTabStop: () => void };
export const Board = forwardRef<BoardHandle, { game: GameState; generation: number; activate: (index: number) => void }>(function Board({ game, generation, activate }, ref) {
  const [focus, setFocus] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setFocus(0); }, [generation]);
  useImperativeHandle(ref, () => ({ focusTabStop: () => buttons.current[focus]?.focus() }), [focus]);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(index / game.size), col = index % game.size;
    let next = index;
    if (event.key === 'ArrowLeft' && col > 0) next--;
    else if (event.key === 'ArrowRight' && col < game.size - 1) next++;
    else if (event.key === 'ArrowUp' && row > 0) next -= game.size;
    else if (event.key === 'ArrowDown' && row < game.size - 1) next += game.size;
    else if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); buttons.current[next]?.focus();
  }
  const style: CSSProperties & { '--columns': number } = { '--columns': game.size };
  return <div className="board-scroll" aria-label="Game board"><div className="board" style={style}>
    {game.deck.map((face, index) => {
      const matched = game.matched.includes(index), s = game.selection;
      const revealed = matched || (s.kind === 'one' && s.index === index) || (s.kind === 'mismatch' && (s.first === index || s.second === index));
      const position = `Row ${Math.floor(index / game.size) + 1}, column ${index % game.size + 1}`;
      return <button key={index} ref={element => { buttons.current[index] = element; }} type="button" className={`card ${revealed ? 'revealed' : ''} ${matched ? 'matched' : ''}`} tabIndex={focus === index ? 0 : -1} aria-disabled={matched || undefined} aria-label={revealed ? `${position}, ${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : `${position}, closed`} onFocus={event => { setFocus(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={event => move(event, index)} onClick={() => activate(index)}>
        {revealed ? <><Face id={face} />{matched && <span className="check" aria-hidden="true">✓</span>}</> : <span className="diamond" aria-hidden="true">◇</span>}
      </button>;
    })}
  </div></div>;
});
