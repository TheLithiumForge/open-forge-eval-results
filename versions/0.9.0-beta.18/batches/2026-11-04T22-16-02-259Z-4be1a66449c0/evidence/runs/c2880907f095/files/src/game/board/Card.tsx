import type { KeyboardEvent, MouseEvent } from 'react';
import { SELECTION } from '../constants';
import { faceInfo } from '../faces';
import type { GameState } from '../types';
import { FaceArtwork } from '../faces/FaceArtwork';
import './Card.css';

type Props = Readonly<{
  game: GameState;
  index: number;
  tabIndex: 0 | -1;
  onActivate: (index: number) => void;
  onFocus: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  setButton: (index: number, button: HTMLButtonElement | null) => void;
}>;

const FOCUS_MARGIN = 6;

export function Card({ game, index, tabIndex, onActivate, onFocus, onKeyDown, setButton }: Props) {
  const isMatched = game.matched.includes(index);
  const selected = game.selection.kind === SELECTION.ONE && game.selection.index === index;
  const mismatch = game.selection.kind === SELECTION.MISMATCH
    && (game.selection.first === index || game.selection.second === index);
  const revealed = isMatched || selected || mismatch;
  const faceId = revealed ? game.board.deck[index] : undefined;
  const row = Math.floor(index / game.board.size) + 1;
  const column = index % game.board.size + 1;
  const stateName = isMatched ? 'matched' : 'revealed';
  const label = revealed && faceId !== undefined
    ? `Row ${row}, column ${column}, ${faceInfo(faceId).name}, ${stateName}`
    : `Row ${row}, column ${column}, closed`;

  const activate = (_event: MouseEvent<HTMLButtonElement>) => onActivate(index);
  return (
    <button
      ref={(button) => setButton(index, button)}
      className={`card${revealed ? ' card--face' : ''}${isMatched ? ' card--matched' : ''}`}
      type="button"
      tabIndex={tabIndex}
      aria-label={label}
      aria-disabled={isMatched ? true : undefined}
      onClick={activate}
      onFocus={(event) => {
        scrollCardIntoView(event.currentTarget);
        onFocus(index);
      }}
      onKeyDown={(event) => onKeyDown(event, index)}
    >
      {revealed && faceId !== undefined
        ? <FaceArtwork faceId={faceId} />
        : <span className="card-back-diamond" aria-hidden="true" />}
      {isMatched && <span className="card-check" aria-hidden="true">✓</span>}
    </button>
  );
}

function scrollCardIntoView(button: HTMLButtonElement): void {
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const area = button.closest<HTMLElement>('.board-scroll');
  if (!area) return;
  const cardRect = button.getBoundingClientRect();
  const areaRect = area.getBoundingClientRect();
  if (cardRect.left < areaRect.left + FOCUS_MARGIN) {
    area.scrollLeft -= areaRect.left + FOCUS_MARGIN - cardRect.left;
  } else if (cardRect.right > areaRect.right - FOCUS_MARGIN) {
    area.scrollLeft += cardRect.right - (areaRect.right - FOCUS_MARGIN);
  }
  if (cardRect.top < areaRect.top + FOCUS_MARGIN) {
    area.scrollTop -= areaRect.top + FOCUS_MARGIN - cardRect.top;
  } else if (cardRect.bottom > areaRect.bottom - FOCUS_MARGIN) {
    area.scrollTop += cardRect.bottom - (areaRect.bottom - FOCUS_MARGIN);
  }
}
