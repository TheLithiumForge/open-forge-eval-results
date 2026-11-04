import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GameState } from '../state.ts';
import { SELECTION_KIND } from '../state.ts';
import { faceName } from './faces.ts';
import { Card } from './Card.tsx';
import './Board.css';

export interface BoardHandle {
  focusRemembered(): void;
}

interface BoardProps {
  readonly game: GameState;
  readonly dealRevision: number;
  readonly activateCard: (index: number) => void;
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, dealRevision, activateCard }, ref) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cardSize, setCardSize] = useState(44);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const side = game.board.size;
  const total = game.board.deck.length;

  useImperativeHandle(ref, () => ({
    focusRemembered: () => cardRefs.current[focusedIndex]?.focus(),
  }), [focusedIndex]);

  useLayoutEffect(() => {
    setFocusedIndex(0);
    const area = scrollRef.current;
    if (area === null) return;
    const resize = () => {
      const usable = Math.max(0, area.clientWidth - 12);
      const width = Math.floor((usable - (side - 1) * 6) / side);
      setCardSize(Math.min(88, Math.max(44, width)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(area);
    return () => observer.disconnect();
  }, [dealRevision, side]);

  function handleFocus(index: number, element: HTMLButtonElement): void {
    setFocusedIndex(index);
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function moveFocus(index: number, event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    let destination = index;
    if (event.key === 'ArrowLeft') destination = index % side > 0 ? index - 1 : index;
    else if (event.key === 'ArrowRight') destination = index % side < side - 1 ? index + 1 : index;
    else if (event.key === 'ArrowUp') destination = index >= side ? index - side : index;
    else if (event.key === 'ArrowDown') destination = index + side < total ? index + side : index;
    else return;
    event.preventDefault();
    cardRefs.current[destination]?.focus();
  }

  function describeCard(index: number, faceId: number, visible: boolean, matched: boolean): string {
    const row = Math.floor(index / side) + 1;
    const column = (index % side) + 1;
    if (!visible) return `Row ${row}, column ${column}, closed`;
    return `Row ${row}, column ${column}, ${faceName(faceId)}, ${matched ? 'matched' : 'revealed'}`;
  }

  return (
    <div className="board-scroll" ref={scrollRef}>
      <div className="card-grid" role="group" aria-label={`${side} by ${side} memory board`} style={{ gridTemplateColumns: `repeat(${side}, ${cardSize}px)` }}>
        {game.board.deck.map((faceId, index) => {
          const matched = game.matched.includes(index);
          const visible = matched || (game.selection.kind === SELECTION_KIND.one && game.selection.index === index)
            || (game.selection.kind === SELECTION_KIND.mismatch && (game.selection.first === index || game.selection.second === index));
          return (
            <Card
              key={index}
              label={describeCard(index, faceId, visible, matched)}
              faceId={visible ? faceId : null}
              matched={matched}
              tabIndex={focusedIndex === index ? 0 : -1}
              size={cardSize}
              buttonRef={(element) => { cardRefs.current[index] = element; }}
              onFocus={(element) => handleFocus(index, element)}
              onKeyDown={(event) => moveFocus(index, event)}
              onClick={(event) => {
                if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
                if (event.detail > 0 && event.button !== 0) return;
                activateCard(index);
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
