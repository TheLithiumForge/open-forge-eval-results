import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { isRevealed, type GameState } from '../core.ts';
import { faceName, Face } from './Face.tsx';
import './board.css';

interface BoardProps {
  readonly game: GameState;
  readonly paused: boolean;
  readonly resetToken: number;
  readonly resumeToken: number;
  readonly onActivate: (index: number) => void;
}

export function Board({ game, paused, resetToken, resumeToken, onActivate }: BoardProps) {
  const [tabStop, setTabStop] = useState(0);
  const [cardSize, setCardSize] = useState(44);
  const area = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const remembered = useRef(0);

  useLayoutEffect(() => {
    remembered.current = 0;
    setTabStop(0);
  }, [resetToken]);

  useLayoutEffect(() => {
    if (resumeToken > 0) buttons.current[remembered.current]?.focus();
  }, [resumeToken]);

  useLayoutEffect(() => {
    const element = area.current;
    if (element === null) return;
    const resize = (): void => {
      const available = element.clientWidth - 12 - (game.size - 1) * 6;
      setCardSize(Math.max(44, Math.min(88, available / game.size)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [game.size]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const directions: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const movement = directions[event.key];
    if (movement === undefined) return;
    event.preventDefault();
    const row = Math.floor(index / game.size);
    const column = index % game.size;
    const nextRow = row + movement[1];
    const nextColumn = column + movement[0];
    if (nextRow < 0 || nextRow >= game.size || nextColumn < 0 || nextColumn >= game.size) return;
    buttons.current[nextRow * game.size + nextColumn]?.focus();
  }

  return (
    <div className="board-scroll" ref={area}>
      <div className="board-grid" role="group" aria-label={`${game.size} by ${game.size} card board`} style={{ gridTemplateColumns: `repeat(${game.size}, ${cardSize}px)` }}>
        {game.deck.map((face, index) => {
          const shown = isRevealed(game, index);
          const matched = game.matched.includes(index);
          const row = Math.floor(index / game.size) + 1;
          const column = (index % game.size) + 1;
          const state = matched ? 'matched' : shown ? 'revealed' : 'closed';
          const label = shown ? `Row ${row}, column ${column}, ${faceName(face)}, ${state}` : `Row ${row}, column ${column}, closed`;
          return (
            <button
              key={index}
              ref={(element) => { buttons.current[index] = element; }}
              className={`card${shown ? ' card-face' : ''}${matched ? ' card-matched' : ''}`}
              type="button"
              aria-label={label}
              aria-disabled={matched || undefined}
              tabIndex={index === tabStop ? 0 : -1}
              style={{ width: cardSize, height: cardSize }}
              onFocus={() => {
                remembered.current = index;
                setTabStop(index);
                buttons.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
              onKeyDown={(event) => moveFocus(event, index)}
              onClick={() => onActivate(index)}
            >
              {shown ? <Face faceId={face} /> : <span className="card-back" aria-hidden="true" />}
              {matched && <span className="matched-check" aria-hidden="true">✓</span>}
              {paused && <span className="sr-only"> Play paused; select Resume to continue.</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
