import { GRID_SIZES, isGridSize } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import './DealControls.css';

export interface DealControlsProps {
  size: GridSize;
  onSizeChange: (size: GridSize) => void;
  onNewGame: () => void;
  onRestart: () => void;
}

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control" htmlFor="grid-size">Grid size
      <select id="grid-size" value={size} onChange={(event) => {
        const selected = Number(event.currentTarget.value);
        if (isGridSize(selected)) onSizeChange(selected);
      }}>
        {GRID_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </label>
    <button type="button" className="new-game" onClick={onNewGame}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
