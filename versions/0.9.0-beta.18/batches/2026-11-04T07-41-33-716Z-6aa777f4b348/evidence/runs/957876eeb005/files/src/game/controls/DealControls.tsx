import { isGridSize, SUPPORTED_SIZES } from '../board-code.ts';
import type { GridSize } from '../board-code.ts';
import './DealControls.css';

export interface DealControlsProps {
  readonly size: GridSize;
  readonly onSize: (size: GridSize) => void;
  readonly onNew: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSize, onNew, onRestart }: DealControlsProps) {
  return (
    <div className="deal-controls">
      <label className="size-control">Grid size
        <select value={size} onChange={event => {
          const next = Number(event.currentTarget.value);
          if (isGridSize(next)) onSize(next);
        }}>
          {SUPPORTED_SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}
        </select>
      </label>
      <button type="button" className="new-game" onClick={onNew}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
