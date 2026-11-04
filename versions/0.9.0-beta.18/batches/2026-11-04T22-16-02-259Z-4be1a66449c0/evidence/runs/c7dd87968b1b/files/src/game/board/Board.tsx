import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { GameState } from '../types.ts';
import { Card } from './Card.tsx';
import './board.css';

export type BoardHandle = { focusRemembered: () => void };
type BoardProps = { game: GameState; epoch: number; onActivate: (index: number) => void };

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ game, epoch, onActivate }, ref) {
  const [remembered, setRemembered] = useState({ epoch, index: 0 });
  const [cardSize, setCardSize] = useState(44);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollArea = useRef<HTMLDivElement>(null);
  const focusIndex = remembered.epoch === epoch ? remembered.index : 0;
  const gridStyle: CSSProperties & { '--columns': number; '--card-size': string } = {
    '--columns': game.board.size,
    '--card-size': `${cardSize}px`,
  };
  const matched = new Set(game.matched);
  const revealed = new Set<number>(game.matched);
  if (game.selection.kind === 'one') revealed.add(game.selection.index);
  if (game.selection.kind === 'mismatch') { revealed.add(game.selection.first); revealed.add(game.selection.second); }

  useImperativeHandle(ref, () => ({ focusRemembered: () => buttons.current[focusIndex]?.focus() }), [focusIndex]);
  useLayoutEffect(() => {
    const area = scrollArea.current;
    if (!area) return;
    const update = (): void => {
      const available = area.clientWidth - 12 - 6 * (game.board.size - 1);
      setCardSize(Math.max(44, Math.min(88, available / game.board.size)));
    };
    const observer = new ResizeObserver(update);
    observer.observe(area);
    update();
    return () => observer.disconnect();
  }, [game.board.size]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const index = focusIndex;
    const row = Math.floor(index / game.board.size);
    const column = index % game.board.size;
    let next: number | undefined;
    if (event.key === 'ArrowLeft' && column > 0) next = index - 1;
    else if (event.key === 'ArrowRight' && column < game.board.size - 1) next = index + 1;
    else if (event.key === 'ArrowUp' && row > 0) next = index - game.board.size;
    else if (event.key === 'ArrowDown' && row < game.board.size - 1) next = index + game.board.size;
    if (next !== undefined) { event.preventDefault(); buttons.current[next]?.focus(); }
  };

  return (
      <div className="board-scroll" ref={scrollArea} role="region" aria-label="Game board">
      <div className="board-grid" role="group" onKeyDown={moveFocus} style={gridStyle}>
        {game.board.deck.map((faceId, index) => (
          <Card
            key={index}
            index={index}
            size={game.board.size}
            faceId={faceId}
            visible={revealed.has(index)}
            matched={matched.has(index)}
            tabIndex={focusIndex === index ? 0 : -1}
            onActivate={onActivate}
            onFocus={(focused, element) => {
              setRemembered({ epoch, index: focused });
              if (scrollArea.current) element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
            buttonRef={(element) => { buttons.current[index] = element; }}
          />
        ))}
      </div>
    </div>
  );
});
