import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import type { GameState } from '../state.ts';
import { isRevealed } from '../state.ts';
import { Card } from './Card.tsx';
import { focusDestination, movementKeys } from './navigation.ts';
import './Board.css';

interface BoardProps {
  state: GameState;
  onActivate(index: number): void;
  focusBoard: RefObject<(() => void) | null>;
}

export function Board({ state, onActivate, focusBoard }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const element = useRef<HTMLDivElement>(null);
  const size = state.board.size;
  const focus = useCallback((index: number) => {
    element.current?.querySelectorAll('button').item(index)?.focus({ preventScroll: true });
  }, []);
  focusBoard.current = () => focus(tabStop);
  const onFocus = useCallback((index: number, button: HTMLButtonElement) => {
    setTabStop(index);
    button.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }, []);
  const onNavigate = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!movementKeys.includes(event.key)) return;
    event.preventDefault();
    focus(focusDestination(index, size, event.key));
  }, [focus, size]);
  return <div className="board-scroll" aria-label="Card board">
    <div className="board" ref={element} style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 88px))`,
      minWidth: size * 44 + (size - 1) * 6 }}>
      {state.board.deck.map((face, index) => <Card key={index} index={index} size={size}
        face={isRevealed(state, index) ? face : undefined} matched={state.matched.includes(index)}
        tabStop={tabStop === index} onActivate={onActivate} onFocus={onFocus} onNavigate={onNavigate} />)}
    </div>
  </div>;
}
