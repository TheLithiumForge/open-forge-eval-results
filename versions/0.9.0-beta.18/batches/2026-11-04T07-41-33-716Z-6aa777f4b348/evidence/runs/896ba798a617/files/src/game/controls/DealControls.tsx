import { isBoardSize, SUPPORTED_SIZES } from '../boardCode.ts';
import type { BoardSize } from '../boardCode.ts';
import './DealControls.css';

type DealControlsProps = Readonly<{
  size: BoardSize; onSizeChange: (size: BoardSize) => void; onNew: () => void; onRestart: () => void;
}>;

export function DealControls({ size, onSizeChange, onNew, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={(event) => {
        const next = Number(event.currentTarget.value);
        if (isBoardSize(next) && next !== size) onSizeChange(next);
      }}>
        {SUPPORTED_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </label>
    <button type="button" onClick={onNew}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
