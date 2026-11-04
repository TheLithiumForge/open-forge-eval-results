import { useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import './Board.css';

export type BoardHandle = { focusRemembered(): void };
type Props = { game: GameState; activate: (index: number) => void; ref: Ref<BoardHandle> };
export function Board({ game, activate, ref }: Props) {
  const [remembered, setRemembered] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const area = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ focusRemembered() { buttons.current.get(remembered)?.focus(); } }), [remembered]);

  function focus(index: number) {
    setRemembered(index);
    const button = buttons.current.get(index);
    const container = area.current;
    if (!button || !container) return;
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // Include the focus ring even for cards in the middle of the scroll area.
    const box = button.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    if (box.left - 6 < viewport.left) container.scrollLeft -= viewport.left - box.left + 6;
    if (box.right + 6 > viewport.right) container.scrollLeft += box.right + 6 - viewport.right;
    if (box.top - 6 < viewport.top) container.scrollTop -= viewport.top - box.top + 6;
    if (box.bottom + 6 > viewport.bottom) container.scrollTop += box.bottom + 6 - viewport.bottom;
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (modified) return;
    const size = game.board.size;
    let target = index;
    switch (event.key) {
      case 'ArrowLeft': if (index % size > 0) target--; break;
      case 'ArrowRight': if (index % size < size - 1) target++; break;
      case 'ArrowUp': if (index >= size) target -= size; break;
      case 'ArrowDown': if (index < size * (size - 1)) target += size; break;
      default: return;
    }
    event.preventDefault();
    buttons.current.get(target)?.focus();
  }
  return <div className="board-scroll" ref={area} role="group" aria-label={`${game.board.size} by ${game.board.size} memory board`}>
    <div className="board" style={{ minWidth: game.board.size * 44 + (game.board.size - 1) * 6, gridTemplateColumns: `repeat(${game.board.size}, minmax(44px, 88px))` }}>
      {game.board.deck.map((face, index) => {
        const matched = game.matched.includes(index);
        const selection = game.selection;
        const revealed = matched || (selection.kind === 'one' && selection.index === index) ||
          (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} index={index} size={game.board.size} face={revealed ? face : undefined}
          matched={matched} tabIndex={remembered === index ? 0 : -1}
          buttonRef={button => { if (button) buttons.current.set(index, button); else buttons.current.delete(index); }}
          onFocus={() => focus(index)} onActivate={() => activate(index)} onKeyDown={event => navigate(event, index)} />;
      })}
    </div>
  </div>;
}
