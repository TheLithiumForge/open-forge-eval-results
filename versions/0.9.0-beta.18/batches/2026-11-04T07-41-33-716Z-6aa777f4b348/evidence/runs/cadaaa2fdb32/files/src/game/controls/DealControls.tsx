import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

interface DealControlsProps {
  size: Size;
  onNewGame: (size?: Size) => void;
  onRestart: () => void;
}

export function DealControls({ size, onNewGame, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => {
        const next = Number(event.target.value);
        if (isSize(next) && next !== size) onNewGame(next);
      }}>{SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}</select>
    </label>
    <div className="deal-actions">
      <button type="button" className="primary" onClick={() => onNewGame()}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  </div>;
}
