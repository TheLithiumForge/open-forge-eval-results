import { isSize, SIZES } from '../board-code.ts';
import type { Size } from '../board-code.ts';
import './DealControls.css';

interface DealControlsProps {
  size: Size; changeSize: (size: Size) => void; newGame: () => void; restart: () => void;
}

export function DealControls({ size, changeSize, newGame, restart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-label">Grid size
      <select value={size} onChange={event => {
        const next = Number(event.target.value);
        if (isSize(next)) changeSize(next);
      }}>{SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}</select>
    </label>
    <button type="button" className="primary" onClick={newGame}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
  </div>;
}
