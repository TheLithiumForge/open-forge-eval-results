import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../model.ts';
import { Face } from './Face.tsx';
import { faceParts } from './faces.ts';
import './Board.css';

export interface BoardHandle { focus: () => void }
interface BoardProps { game: GameState; paused: boolean; activate: (index: number) => void; ref: Ref<BoardHandle> }

export function Board({ game, paused, activate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({ focus: () => buttons.current.get(tabStop)?.focus() }), [tabStop]);
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const size = game.board.size;
    let next = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) next--; break;
      case 'ArrowRight': if (index % size < size - 1) next++; break;
      case 'ArrowUp': if (index >= size) next -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) next += size; break;
      default: return;
    }
    event.preventDefault();
    buttons.current.get(next)?.focus();
  };
  const style: CSSProperties & { '--columns': number; '--gaps': string } = {
    '--columns': game.board.size, '--gaps': `${(game.board.size - 1) * 6}px`,
  };
  return <div className="board-scroll" aria-label="Card board" role="group">
    <div className="board" style={style}>
      {game.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const selected = game.selection.kind === 'one' ? game.selection.index === index
          : game.selection.kind === 'mismatch' && (game.selection.first === index || game.selection.second === index);
        const revealed = matched || selected;
        const position = `Row ${Math.floor(index / game.board.size) + 1}, column ${index % game.board.size + 1}`;
        const state = matched ? 'matched' : revealed ? 'revealed' : 'closed';
        return <button key={index} type="button" className={`card ${state}`} tabIndex={tabStop === index ? 0 : -1}
          ref={node => { if (node) buttons.current.set(index, node); else buttons.current.delete(index); }}
          aria-label={`${position}, ${revealed ? `${faceParts(face).name}, ` : ''}${state}`}
          aria-disabled={matched || paused || game.selection.kind === 'mismatch'}
          onFocus={event => {
            setTabStop(index);
            event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }}
          onKeyDown={event => onKey(event, index)} onClick={event => {
            if (event.detail !== 0 || !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) activate(index);
          }}>
          {revealed ? <Face id={face} /> : <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path d="M50 39 61 50 50 61 39 50Z" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>}
          {matched && <span className="check" aria-hidden="true">✓</span>}
        </button>;
      })}
    </div>
  </div>;
}
