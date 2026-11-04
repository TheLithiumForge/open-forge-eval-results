import { isSize, sizes } from '../deal.ts';
import type { Size } from '../deal.ts';
import './DealControls.css';

interface DealControlsProps {
  size: Size;
  onSize(size: Size): void;
  onNew(): void;
  onRestart(): void;
}

export function DealControls({ size, onSize, onNew, onRestart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => {
        const value = Number(event.target.value);
        if (isSize(value) && value !== size) onSize(value);
      }}>{sizes.map(option => <option key={option} value={option}>{option}x{option}</option>)}</select>
    </label>
    <button type="button" className="new-game" onClick={onNew}>New Game</button>
    <button type="button" onClick={onRestart}>Restart</button>
  </div>;
}
