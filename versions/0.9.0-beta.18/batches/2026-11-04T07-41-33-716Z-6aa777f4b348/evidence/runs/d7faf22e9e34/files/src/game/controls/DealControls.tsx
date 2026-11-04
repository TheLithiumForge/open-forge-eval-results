import { isSupportedSize, SIZES } from '../boardCode.ts';
import type { SupportedSize } from '../boardCode.ts';
import './DealControls.css';

interface DealControlsProps {
  readonly size: SupportedSize;
  readonly onSize: (size: SupportedSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSize, onNewGame, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={(event) => {
        const next = Number(event.currentTarget.value);
        if (isSupportedSize(next)) onSize(next);
      }}>
        {SIZES.map((value) => <option key={value} value={value}>{value}x{value}</option>)}
      </select>
    </label>
    <button type="button" onClick={onNewGame}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
