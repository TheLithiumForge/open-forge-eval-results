import { SUPPORTED_SIZES } from '../boardCode.ts';
import type { GridSize } from '../boardCode.ts';
import './DealControls.css';

interface DealControlsProps {
  readonly size: GridSize;
  readonly onSize: (size: number) => void;
  readonly onNew: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSize, onNew, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control" htmlFor="grid-size">Grid size
      <select id="grid-size" value={size} onChange={event => onSize(Number(event.currentTarget.value))}>
        {SUPPORTED_SIZES.map(side => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </label>
    <div className="deal-actions"><button type="button" className="new-game" onClick={onNew}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button></div>
  </div>;
}
