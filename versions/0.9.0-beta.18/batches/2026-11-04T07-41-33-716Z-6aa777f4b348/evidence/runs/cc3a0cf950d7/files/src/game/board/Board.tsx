import { useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { isRevealed } from '../state.ts';
import type { GameState } from '../state.ts';
import { Face } from './Face.tsx';
import { faceName } from './faces.ts';
import { nextPosition } from './navigation.ts';
import './Board.css';

interface BoardProps {
  game: GameState; paused: boolean; activate: (index: number) => void;
  tabStopRef: RefObject<HTMLButtonElement | null>;
}

export function Board({ game, paused, activate, tabStopRef }: BoardProps) {
  const [position, setPosition] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const size = game.board.size;
  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      buttons.current.get(nextPosition(index, size, event.key))?.focus();
    }
  }
  return <div className="board-scroll" aria-label="Card board">
    <div className="board" style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
      minWidth: size * 44 + (size - 1) * 6 }}>
      {game.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const revealed = isRevealed(game, index);
        const state = matched ? 'matched' : revealed ? 'revealed' : 'closed';
        const location = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`;
        return <button type="button" key={index} className={`card ${state}`}
          ref={element => {
            if (element) buttons.current.set(index, element); else buttons.current.delete(index);
            if (index === position) tabStopRef.current = element;
          }}
          aria-label={`${location}, ${revealed ? `${faceName(face)}, ` : ''}${state}`}
          aria-disabled={matched || paused || game.selection.kind === 'mismatch'}
          tabIndex={index === position ? 0 : -1}
          onFocus={event => {
            setPosition(index);
            tabStopRef.current = event.currentTarget;
            event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }}
          onKeyDown={event => onKey(event, index)}
          onClick={event => {
            if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) activate(index);
          }}>
          {revealed ? <Face id={face} /> : <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path d="M50 38 62 50 50 62 38 50Z" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>}
          {matched && <span className="check" aria-hidden="true">✓</span>}
        </button>;
      })}
    </div>
  </div>;
}
