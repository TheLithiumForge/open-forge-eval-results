import { isSize, SIZES } from '../deal.ts';
import type { Size } from '../deal.ts';
import './DealControls.css';

export type DealControlsProps = Readonly<{
  size: Size; onNewGame: () => void; onRestart: () => void; onSize: (size: Size) => void;
}>;

export function DealControls({ size, onNewGame, onRestart, onSize }: DealControlsProps) {
  return <div className="deal-controls">
    <div className="size-control">
      <label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={event => {
        const next = Number(event.target.value);
        if (isSize(next) && next !== size) onSize(next);
      }}>
        {SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}
      </select>
    </div>
    <button type="button" className="primary" onClick={onNewGame}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
