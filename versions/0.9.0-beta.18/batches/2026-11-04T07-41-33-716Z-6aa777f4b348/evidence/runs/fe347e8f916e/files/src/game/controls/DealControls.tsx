import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

export interface DealControlsProps {
  readonly size: Size;
  readonly newGame: (size?: Size) => void;
  readonly restart: () => void;
}
export function DealControls({ size, newGame, restart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-label">Grid size
      <select value={size} onChange={(event) => {
        const next = Number(event.target.value);
        if (isSize(next) && next !== size) newGame(next);
      }}>{SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}</select>
    </label>
    <div className="deal-buttons">
      <button className="primary" type="button" onClick={() => newGame()}>New Game</button>
      <button type="button" onClick={restart}>Restart</button>
    </div>
  </div>;
}
