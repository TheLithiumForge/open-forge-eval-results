import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

export type DealControlsProps = Readonly<{
  size: Size; onNewGame(size?: Size): void; onRestart(): void;
}>;
export function DealControls({ size, onNewGame, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => {
        const next = Number(event.target.value);
        if (isSize(next) && next !== size) onNewGame(next);
      }}>
        {SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}
      </select>
    </label>
    <button type="button" className="new-game" onClick={() => onNewGame()}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
