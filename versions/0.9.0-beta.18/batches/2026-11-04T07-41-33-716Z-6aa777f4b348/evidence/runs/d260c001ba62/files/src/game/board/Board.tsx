import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { describeFace } from './faces.ts';
import { Face } from './Face.tsx';
import './Board.css';

export interface BoardHandle { focusRemembered: () => void }
interface BoardProps { game: GameState; onActivate: (index: number) => void; ref: Ref<BoardHandle> }

export function Board({ game, onActivate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const cards = useRef(new Map<number, HTMLButtonElement>());
  const size = game.board.size;
  useImperativeHandle(ref, () => ({ focusRemembered: () => cards.current.get(tabStop)?.focus() }), [tabStop]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
      return;
    }
    let destination = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) destination--; break;
      case 'ArrowRight': if (index % size < size - 1) destination++; break;
      case 'ArrowUp': if (index >= size) destination -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) destination += size; break;
      default: return;
    }
    event.preventDefault();
    cards.current.get(destination)?.focus();
  }

  const style: CSSProperties & { '--columns': number } = { '--columns': size };
  return <div className="board-scroll" aria-label="Card board">
    <div className="board" style={style}>
      {game.board.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = isRevealed(game, index);
        const position = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
        const state = matched ? 'matched' : revealed ? 'revealed' : 'closed';
        const name = revealed ? `${position}, ${describeFace(face).name}, ${state}` : `${position}, closed`;
        return <button key={index} type="button" className={`card ${state}`} aria-label={name}
          aria-disabled={matched ? true : undefined} tabIndex={tabStop === index ? 0 : -1}
          ref={element => { if (element) cards.current.set(index, element); else cards.current.delete(index); }}
          onFocus={event => {
            setTabStop(index);
            event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          }}
          onKeyDown={event => navigate(event, index)}
          onClick={event => {
            if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) onActivate(index);
          }}>
          {revealed ? <Face id={face} /> : <span className="card-back" aria-hidden="true">◇</span>}
          {matched && <span className="match-check" aria-hidden="true">✓</span>}
        </button>;
      })}
    </div>
  </div>;
}
