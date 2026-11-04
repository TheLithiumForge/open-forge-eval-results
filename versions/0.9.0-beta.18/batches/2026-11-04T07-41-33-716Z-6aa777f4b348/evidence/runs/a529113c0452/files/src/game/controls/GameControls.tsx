import { GRID_SIZES } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import './GameControls.css';

type GameControlsProps = Readonly<{
  size: GridSize;
  onSize: (value: unknown) => void;
  onNew: () => void;
  onRestart: () => void;
}>;

export function GameControls({ size, onSize, onNew, onRestart }: GameControlsProps) {
  return (
    <div className="deal-controls">
      <label className="size-field">Grid size
        <select value={size} onChange={(event) => onSize(Number(event.currentTarget.value))}>
          {GRID_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </label>
      <button type="button" onClick={onNew}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
