import { GRID_SIZES, isGridSize } from '../deck.ts';
import type { GridSize } from '../deck.ts';
import './controls.css';

type DealControlsProps = Readonly<{ size: GridSize; newGame: (size?: GridSize) => void; restart: () => void }>;

export function DealControls({ size, newGame, restart }: DealControlsProps) {
  return <div className="deal-controls">
    <div className="size-control">
      <label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={event => {
        const next = Number(event.currentTarget.value);
        if (isGridSize(next) && next !== size) newGame(next);
      }}>
        {GRID_SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}
      </select>
    </div>
    <button type="button" onClick={() => newGame()}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
  </div>;
}
