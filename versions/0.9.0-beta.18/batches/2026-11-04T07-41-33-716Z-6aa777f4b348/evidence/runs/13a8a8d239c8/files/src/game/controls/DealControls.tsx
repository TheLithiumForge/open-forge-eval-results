import type { ChangeEvent } from 'react';
import { isGridSize } from '../board.ts';
import type { GameSession } from '../session/use-game-session.ts';
import './DealControls.css';

interface DealControlsProps {
  readonly session: GameSession;
}

export function DealControls({ session }: DealControlsProps) {
  function changeSize(event: ChangeEvent<HTMLSelectElement>): void {
    const size = Number(event.currentTarget.value);
    if (isGridSize(size)) session.changeSize(size);
  }

  return (
    <div className="deal-controls">
      <label className="grid-size-control">
        <span>Grid size</span>
        <select aria-label="Grid size" value={session.game.board.size} onChange={changeSize}>
          {session.gridSizes.map((size) => <option key={size} value={size}>{size}x{size}</option>)}
        </select>
      </label>
      <button type="button" onClick={session.newGame}>New Game</button>
      <button type="button" onClick={session.restart}>Restart</button>
    </div>
  );
}
