import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { isRevealed } from '../model.ts';
import type { GameState } from '../model.ts';
import { Card } from './Card.tsx';
import './Board.css';

export interface BoardHandle { focusRemembered: () => void }
export interface BoardProps {
  readonly game: GameState;
  readonly activate: (index: number) => void;
  readonly ref: Ref<BoardHandle>;
}

export function Board({ game, activate, ref }: BoardProps) {
  const area = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const [remembered, remember] = useState(0);
  const [cardSize, setCardSize] = useState(44);
  const size = game.board.size;
  const register = useCallback((index: number, button: HTMLButtonElement | null) => {
    cards.current[index] = button;
  }, []);
  useImperativeHandle(ref, () => ({ focusRemembered: () => cards.current[remembered]?.focus() }), [remembered]);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const measure = () => setCardSize(Math.max(44, Math.min(88, (element.clientWidth - 12 - 6 * (size - 1)) / size)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [size]);
  return <div className="board-scroll" ref={area} role="group" aria-label={`${size} by ${size} card board`}
    onKeyDown={(event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const row = Math.floor(remembered / size);
      const column = remembered % size;
      let next = remembered;
      switch (event.key) {
        case 'ArrowLeft': if (column > 0) next -= 1; break;
        case 'ArrowRight': if (column < size - 1) next += 1; break;
        case 'ArrowUp': if (row > 0) next -= size; break;
        case 'ArrowDown': if (row < size - 1) next += size; break;
        default: return;
      }
      event.preventDefault();
      cards.current[next]?.focus();
    }}>
    <div className="board-grid" style={{ gridTemplateColumns: `repeat(${size}, ${cardSize}px)`, gridAutoRows: `${cardSize}px` }}>
      {game.board.deck.map((face, index) => <Card key={index} index={index} size={size}
        face={isRevealed(game, index) ? face : null} matched={game.matched.includes(index)}
        tabStop={remembered === index} activate={activate} remember={remember} register={register} />)}
    </div>
  </div>;
}
