import { isSize, SIZES } from '../deal.ts';
import type { Size } from '../deal.ts';
import './DealControls.css';

interface DealControlsProps { size: Size; newGame: (size?: Size) => void; restart: () => void }

export function DealControls({ size, newGame, restart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => {
        const selected = Number(event.currentTarget.value);
        if (isSize(selected) && selected !== size) newGame(selected);
      }}>{SIZES.map(side => <option key={side} value={side}>{side}x{side}</option>)}</select>
    </label>
    <div className="deal-buttons">
      <button type="button" className="primary" onClick={() => newGame()}>New Game <span aria-hidden="true">↗</span></button>
      <button type="button" onClick={restart}>Restart <span aria-hidden="true">↻</span></button>
    </div>
  </div>;
}
