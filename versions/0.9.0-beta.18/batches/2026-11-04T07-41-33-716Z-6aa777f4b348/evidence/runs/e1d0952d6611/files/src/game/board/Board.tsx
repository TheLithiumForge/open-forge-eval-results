import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { GameState } from '../state.ts';
import { Card } from './Card.tsx';
import { moveFocus } from './navigation.ts';
import './Board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type BoardProps = Readonly<{ state: GameState; paused: boolean; resetKey: number; onActivate: (index: number) => void }>;

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ state, paused, resetKey, onActivate }, ref) {
  const [tabStop, setTabStop] = useState(0);
  const remembered = useRef(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const side = state.board.side;
  const matched = new Set(state.matched);

  useLayoutEffect(() => {
    remembered.current = 0;
    setTabStop(0);
  }, [resetKey]);

  useImperativeHandle(ref, () => ({
    focusRemembered() { buttons.current[remembered.current]?.focus(); },
  }), []);

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (modified) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' &&
        event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const destination = moveFocus(index, side, event.key);
    buttons.current[destination]?.focus();
  }

  function setFocused(index: number): void {
    if (remembered.current === index) return;
    remembered.current = index;
    setTabStop(index);
  }

  function focusAndScroll(index: number): void {
    const button = buttons.current[index];
    if (button === null || button === undefined) return;
    setFocused(index);
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  const gapWidth = (side - 1) * 6;
  return (
    <section className="board-area" aria-label="Game board">
      <div className="board-scroll">
        <div className="card-grid" role="group" aria-label={`${side} by ${side} card board`}
          style={{ gridTemplateColumns: `repeat(${side}, minmax(44px, min(88px, calc((100cqi - ${gapWidth}px) / ${side}))))` }}>
          {state.board.deck.map((faceId, index) => {
            const isMatched = matched.has(index);
            const selection = state.selection;
            const isRevealed = selection.kind === 'one' ? selection.index === index
              : selection.kind === 'mismatch' ? selection.first === index || selection.second === index : false;
            return <Card key={index} index={index} side={side} faceId={isMatched || isRevealed ? faceId : null}
              matched={isMatched} tabIndex={tabStop === index ? 0 : -1}
              buttonRef={(button) => { buttons.current[index] = button; }} onFocus={() => focusAndScroll(index)}
              onKeyDown={(event) => keyDown(event, index)} onActivate={() => onActivate(index)} />;
          })}
        </div>
      </div>
    </section>
  );
});
