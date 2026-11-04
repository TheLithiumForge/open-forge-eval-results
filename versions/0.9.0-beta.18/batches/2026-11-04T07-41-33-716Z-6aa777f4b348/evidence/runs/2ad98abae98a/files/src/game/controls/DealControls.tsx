import { isSize, sizes } from '../model.ts';
import type { Size } from '../model.ts';
import './Controls.css';

interface DealControlsProps { size: Size; newGame: (size?: Size) => void; restart: () => void }
export function DealControls({ size, newGame, restart }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => { const value = Number(event.target.value); if (isSize(value)) newGame(value); }}>
        {sizes.map(option => <option key={option} value={option}>{option}x{option}</option>)}
      </select>
    </label>
    <button className="new-game" type="button" onClick={() => newGame()}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
  </div>;
}
