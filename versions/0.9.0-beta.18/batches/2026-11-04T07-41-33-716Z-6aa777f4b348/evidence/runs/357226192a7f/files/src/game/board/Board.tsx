import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
export type BoardProps = Readonly<{
  game: GameState; paused: boolean; dealId: number;
  onActivate: (index: number) => void; ref: Ref<BoardHandle>;
}>;

export function Board({ game, paused, dealId, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => setRemembered(0), [dealId]);
  function focusCard(index: number) {
    grid.current?.querySelectorAll('button').item(index)?.focus();
  }
  useImperativeHandle(ref, () => ({ focusRemembered: () => focusCard(remembered) }), [remembered]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const next = focusDestination(event.key, index, game.board.size);
    if (next !== null) {
      event.preventDefault();
      focusCard(next);
    }
  }
  const style: CSSProperties & { '--columns': number } = { '--columns': game.board.size };
  return <section className="board-section" aria-label="Memory board" aria-describedby="board-help">
    <div className="board-scroll">
      <div className="board-grid" style={style} ref={grid}>
        {game.deck.map((face, index) => {
          const matched = game.matched.includes(index);
          const selection = game.selection;
          const revealed = matched || (selection.kind === 'one' && selection.index === index)
            || (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
          return <Card key={index} index={index} size={game.board.size}
            face={revealed ? face : undefined} matched={matched}
            blocked={paused || selection.kind === 'mismatch'} tabStop={remembered === index}
            onActivate={onActivate} onFocus={setRemembered} onNavigate={navigate} />;
        })}
      </div>
    </div>
    <p id="board-help" className="help">Reveal two cards. Find every pair.<br />Use arrow keys to explore, Enter or Space to reveal.</p>
  </section>;
}
