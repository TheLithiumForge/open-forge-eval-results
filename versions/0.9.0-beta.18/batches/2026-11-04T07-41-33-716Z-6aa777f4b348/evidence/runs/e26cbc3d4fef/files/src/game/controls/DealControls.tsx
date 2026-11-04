import { isGridSize, supportedSizes } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import './DealControls.css';

export interface DealControlsProps {
  readonly size: GridSize;
  readonly onSizeChange: (size: GridSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: DealControlsProps) {
  return (
    <div className="deal-controls">
      <div className="size-control">
        <label htmlFor="grid-size">Grid size</label>
        <select id="grid-size" value={size} onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (isGridSize(next)) onSizeChange(next);
        }}>
          {supportedSizes.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </div>
      <button type="button" className="new-game" onClick={onNewGame}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
