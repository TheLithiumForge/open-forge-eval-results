import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { GameState } from '../game.ts';
import { Face, faceName } from './faces.tsx';
import './board.css';
export type BoardHandle = { focusRemembered: () => void };
type Props = { game: GameState; onActivate: (index: number) => void };
export const Board = forwardRef<BoardHandle, Props>(function Board({ game, onActivate }, ref) {
  const [focus, setFocus] = useState(0); const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current[focus]?.focus() }), [focus]);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const row = Math.floor(index / game.size), col = index % game.size; let target = index;
    switch (event.key) {
      case 'ArrowLeft': if (col > 0) target--; break;
      case 'ArrowRight': if (col < game.size - 1) target++; break;
      case 'ArrowUp': if (row > 0) target -= game.size; break;
      case 'ArrowDown': if (row < game.size - 1) target += game.size; break;
      default: return;
    }
    event.preventDefault(); buttons.current[target]?.focus();
  }
  return <div className="board-scroll" aria-label="Game board"><div className="board" style={{ gridTemplateColumns: `repeat(${game.size}, var(--card-size))`, ['--columns' as string]: game.size }}>
    {game.deck.map((face, index) => {
      const matched = game.matched.includes(index); const selection = game.selection;
      const revealed = matched || (selection.kind === 'one' && selection.index === index) || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
      const position = `Row ${Math.floor(index / game.size) + 1}, column ${index % game.size + 1}`;
      return <button key={index} ref={el => { buttons.current[index] = el; }} type="button" className={`card${revealed ? ' revealed' : ''}${matched ? ' matched' : ''}`} tabIndex={focus === index ? 0 : -1} aria-disabled={matched ? 'true' : undefined} aria-label={revealed ? `${position}, ${faceName(face)}, ${matched ? 'matched' : 'revealed'}` : `${position}, closed`} onFocus={event => { setFocus(index); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }} onKeyDown={event => move(event, index)} onClick={event => { if (event.detail === 0 || event.button === 0) onActivate(index); }}>
        {revealed ? <Face id={face} /> : <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 28L72 50L50 72L28 50Z" fill="none" stroke="#757C9A" strokeWidth="4" /></svg>}{matched && <span className="check" aria-hidden="true">✓</span>}
      </button>;
    })}
  </div></div>;
});
