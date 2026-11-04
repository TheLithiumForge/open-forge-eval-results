import { useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import { isRevealed, selectionKinds } from '../state.ts';
import type { GameState } from '../state.ts';
import { Card, cardStates } from './Card.tsx';
import { focusDestination } from './navigation.ts';
import './Board.css';

export interface BoardHandle { focusRemembered(): void }
export interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly onActivate: (index: number) => void;
  readonly ref?: Ref<BoardHandle>;
}

export function Board({ game, paused, onActivate, ref }: BoardProps) {
  const [remembered, setRemembered] = useState(0);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  useImperativeHandle(ref, () => ({ focusRemembered: () => cards.current[remembered]?.focus() }), [remembered]);
  const style: CSSProperties & { '--columns': number } = { '--columns': game.board.size };

  function navigate(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = focusDestination(remembered, game.board.size, event.key);
    if (destination === null) return;
    event.preventDefault();
    cards.current[destination]?.focus();
  }

  return <div className="board-scroll" role="group" aria-label={`${game.board.size} by ${game.board.size} card board`}>
    <div className="board-grid" style={style} onKeyDown={navigate}>
      {game.deck.map((faceId, index) => {
        const matched = game.matched.includes(index);
        const appearance = matched ? { kind: cardStates.matched, faceId }
          : isRevealed(game, index) ? { kind: cardStates.revealed, faceId } : { kind: cardStates.closed };
        return <Card key={index} index={index} size={game.board.size} appearance={appearance}
          blocked={paused || game.selection.kind === selectionKinds.mismatch}
          tabIndex={remembered === index ? 0 : -1} buttonRef={button => { cards.current[index] = button; }}
          onFocus={button => {
            setRemembered(index);
            button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }} onActivate={() => onActivate(index)} />;
      })}
    </div>
  </div>;
}
