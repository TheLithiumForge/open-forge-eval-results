import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { Board as BoardInfo, Selection } from '../types.ts';
import { FaceArtwork, faceName, BackArtwork } from './Face.tsx';
import './Board.css';

export type BoardHandle = Readonly<{ focusRemembered: () => void }>;
type Props = Readonly<{ board: BoardInfo; matched: readonly number[]; selection: Selection; paused: boolean; resetKey: number; onActivate: (index: number) => void }>;
type BoardStyle = CSSProperties & Readonly<{ '--board-size': number; '--card-size': string }>;

export const Board = memo(forwardRef<BoardHandle, Props>(function Board({ board, matched: matchedPositions, selection, paused, resetKey, onActivate }, ref) {
  const [remembered, setRemembered] = useState(0);
  const [cardSize, setCardSize] = useState(44);
  const areaRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef(new Map<number, HTMLButtonElement>());
  useImperativeHandle(ref, () => ({ focusRemembered: () => buttonsRef.current.get(remembered)?.focus() }), [remembered]);

  useEffect(() => { setRemembered(0); }, [resetKey]);
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => {
      const available = area.clientWidth - 12 - 6 * (board.size - 1);
      setCardSize(Math.max(44, Math.min(88, Math.floor(available / board.size))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, [board.size]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const size = board.size;
    const row = Math.floor(index / size);
    const column = index % size;
    let destination = index;
    if (event.key === 'ArrowLeft' && column > 0) destination -= 1;
    else if (event.key === 'ArrowRight' && column < size - 1) destination += 1;
    else if (event.key === 'ArrowUp' && row > 0) destination -= size;
    else if (event.key === 'ArrowDown' && row < size - 1) destination += size;
    else return;
    event.preventDefault();
    buttonsRef.current.get(destination)?.focus();
  };
  const gridStyle: BoardStyle = { '--board-size': board.size, '--card-size': `${cardSize}px` };

  return <div className="board-scroll" ref={areaRef}>
    <div className="board-grid" role="group" aria-label={`${board.size} by ${board.size} card board`} style={gridStyle}>
      {board.deck.map((faceId, index) => {
        const matched = matchedPositions.includes(index);
        const selected = selection.kind === 'one' && selection.index === index;
        const mismatch = selection.kind === 'mismatch' && (selection.first === index || selection.second === index);
        const revealed = matched || selected || mismatch;
        const row = Math.floor(index / board.size) + 1;
        const column = index % board.size + 1;
        const stateName = matched ? 'matched' : 'revealed';
        const name = revealed ? `Row ${row}, column ${column}, ${faceName(faceId)}, ${stateName}` : `Row ${row}, column ${column}, closed`;
        return <button
          key={index}
          ref={(element) => { if (element) buttonsRef.current.set(index, element); else buttonsRef.current.delete(index); }}
          className={`card${revealed ? ' card-revealed' : ''}${matched ? ' card-matched' : ''}`}
          type="button"
          aria-label={name}
          aria-disabled={matched || paused ? 'true' : undefined}
          tabIndex={remembered === index ? 0 : -1}
          onFocus={(event) => {
            setRemembered(index);
            event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }}
          onKeyDown={(event) => moveFocus(event, index)}
          onClick={() => onActivate(index)}
        >
          {revealed ? <FaceArtwork id={faceId} /> : <BackArtwork />}
          {matched && <span aria-hidden="true" className="matched-check">✓</span>}
        </button>;
      })}
    </div>
  </div>;
}));
