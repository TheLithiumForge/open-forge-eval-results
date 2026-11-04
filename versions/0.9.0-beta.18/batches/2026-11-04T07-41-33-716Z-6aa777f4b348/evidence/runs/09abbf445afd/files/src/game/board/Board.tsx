import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import type { GameState } from '../types.ts';
import { SELECTION_KIND } from '../constants.ts';
import { Card } from './Card.tsx';
import './board.css';

export type BoardHandle = Readonly<{ focusRememberedCard: () => void }>;
type BoardProps = Readonly<{
  game: GameState;
  paused: boolean;
  revision: number;
  onActivate: (index: number) => void;
}>;
type BoardStyle = CSSProperties & Readonly<{ '--card-edge': string; '--column-count': number }>;

function BoardContent({ game, paused, revision, onActivate, expose }: BoardProps & Readonly<{ expose: React.Ref<BoardHandle> }>): React.JSX.Element {
  const size = game.board.size;
  const [tabStop, setTabStop] = useState(0);
  const [cardEdge, setCardEdge] = useState(88);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<number, HTMLButtonElement>());
  const style: BoardStyle = { '--card-edge': `${cardEdge}px`, '--column-count': size };
  const matched = useMemo(() => new Set(game.matched), [game.matched]);
  const revealed = game.selection.kind === SELECTION_KIND.ONE
    ? new Set([game.selection.index])
    : game.selection.kind === SELECTION_KIND.MISMATCH
      ? new Set([game.selection.first, game.selection.second])
      : new Set<number>();
  const blocked = paused || game.selection.kind === SELECTION_KIND.MISMATCH;

  useEffect(() => {
    setTabStop(0);
  }, [revision]);

  useEffect(() => {
    const area = scrollRef.current;
    if (area === null) return;
    const updateSize = (): void => {
      const innerWidth = Math.max(0, area.clientWidth - 12);
      const gaps = (size - 1) * 6;
      const edge = Math.max(44, Math.min(88, (innerWidth - gaps) / size));
      setCardEdge((current) => current === edge ? current : edge);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(area);
    return () => observer.disconnect();
  }, [size]);

  const rememberFocus = (event: FocusEvent<HTMLButtonElement>): void => {
    const position = Number(event.currentTarget.dataset.position);
    if (Number.isSafeInteger(position)) setTabStop(position);
    event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const focusCard = (position: number): void => {
    const button = cards.current.get(position);
    if (button === undefined) return;
    setTabStop(position);
    button.focus({ preventScroll: true });
  };

  useImperativeHandle(expose, () => ({ focusRememberedCard: () => focusCard(tabStop) }), [tabStop]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!arrows.includes(event.key)) return;
    event.preventDefault();
    if (!(event.target instanceof HTMLButtonElement)) return;
    const current = Number(event.target.dataset.position);
    if (!Number.isSafeInteger(current)) return;
    let target = current;
    if (event.key === 'ArrowLeft' && current % size > 0) target -= 1;
    if (event.key === 'ArrowRight' && current % size < size - 1) target += 1;
    if (event.key === 'ArrowUp' && current >= size) target -= size;
    if (event.key === 'ArrowDown' && current < size * (size - 1)) target += size;
    if (target !== current) focusCard(target);
  };

  return (
    <div className="board-scroll" ref={scrollRef} onKeyDown={moveFocus}>
      <div className="memory-board" style={style} role="group" aria-label={`${size} by ${size} cards`}>
        {game.board.deck.map((faceId, position) => (
          <Card
            key={position}
            position={position}
            columns={size}
            faceId={faceId}
            visible={revealed.has(position)}
            matched={matched.has(position)}
            blocked={blocked}
            tabIndex={position === tabStop ? 0 : -1}
            onActivate={onActivate}
            onFocus={rememberFocus}
            onRef={(node) => {
              if (node === null) cards.current.delete(position);
              else cards.current.set(position, node);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board(props, ref) {
  return <BoardContent {...props} expose={ref} />;
});
