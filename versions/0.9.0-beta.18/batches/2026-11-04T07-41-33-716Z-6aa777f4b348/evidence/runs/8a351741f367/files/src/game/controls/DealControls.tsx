import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

interface DealControlsProps {
  readonly size: Size;
  readonly onSize: (size: Size) => void;
  readonly onNew: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSize, onNew, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <div className="size-control"><label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={(event) => {
        const next = Number(event.currentTarget.value);
        if (isSize(next)) onSize(next);
      }}>
        {SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </div>
    <button type="button" onClick={onNew}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
