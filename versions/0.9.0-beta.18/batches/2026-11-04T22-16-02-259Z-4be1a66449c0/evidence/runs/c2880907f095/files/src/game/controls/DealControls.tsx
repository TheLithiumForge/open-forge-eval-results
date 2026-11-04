import { GRID_SIZES } from '../constants';
import type { GridSize } from '../types';
import './DealControls.css';

type Props = Readonly<{
  size: GridSize;
  onSizeChange: (size: number) => void;
  onNewGame: () => void;
  onRestart: () => void;
}>;

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: Props) {
  return (
    <div className="deal-controls">
      <label className="size-label">
        <span>Grid size</span>
        <select value={size} onChange={(event) => onSizeChange(Number(event.currentTarget.value))}>
          {GRID_SIZES.map((value) => <option key={value} value={value}>{value}x{value}</option>)}
        </select>
      </label>
      <button className="action-button" type="button" onClick={onNewGame}>New Game</button>
      <button className="action-button" type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
