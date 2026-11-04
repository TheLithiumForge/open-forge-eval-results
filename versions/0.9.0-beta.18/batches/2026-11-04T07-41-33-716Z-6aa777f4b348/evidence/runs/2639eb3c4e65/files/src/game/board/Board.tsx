import { useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { GameState } from '../model.ts';
import { Card } from './Card.tsx';
import { moveFocus } from './navigation.ts';
import './Board.css';

export type BoardHandle = { focusRemembered: () => void };
type BoardProps = { game: GameState; activate: (index: number) => void; ref: Ref<BoardHandle> };

export function Board({ game, activate, ref }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const size = game.board.size;
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current.get(tabStop)?.focus() }), [tabStop]);
  return <div className="board-scroll" role="group" aria-label={`${size} by ${size} game board`}>
    <div className="board" style={{
      gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))`,
      width: `clamp(${size * 44 + (size - 1) * 6}px, 100%, ${size * 88 + (size - 1) * 6}px)`,
    }}>
      {game.board.deck.map((face, index) => {
        const selection = game.selection;
        const matched = game.matched.includes(index);
        const revealed = matched || (selection.kind === 'one' && selection.index === index) ||
          (selection.kind === 'mismatch' && (selection.first === index || selection.second === index));
        return <Card key={index} position={`Row ${Math.floor(index / size) + 1}, column ${index % size + 1}`}
          face={revealed ? face : undefined} matched={matched} tabStop={tabStop === index}
          setRef={button => { if (button) buttons.current.set(index, button); else buttons.current.delete(index); }}
          focus={() => setTabStop(index)} activate={() => activate(index)} navigate={event => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            buttons.current.get(moveFocus(index, size, event.key))?.focus();
          }} />;
      })}
    </div>
  </div>;
}
