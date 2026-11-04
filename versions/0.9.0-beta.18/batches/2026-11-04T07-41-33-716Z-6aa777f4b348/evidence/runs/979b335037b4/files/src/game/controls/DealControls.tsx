import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './DealControls.css';

export type DealControlsProps = {
  size: Size; newGame: (size?: Size) => void; restart: () => void;
  paused: boolean; resume: () => void;
};

export function DealControls({ size, newGame, restart, paused, resume }: DealControlsProps) {
  return <div className="deal-controls">
    <label className="size-control">Grid size
      <select value={size} onChange={event => {
        const value = Number(event.target.value);
        if (isSize(value) && value !== size) newGame(value);
      }}>
        {SIZES.map(value => <option key={value} value={value}>{value}x{value}</option>)}
      </select>
    </label>
    <button type="button" className="primary-button" onClick={() => newGame()}>New Game</button>
    <button type="button" onClick={restart}>Restart</button>
    {paused && <button type="button" className="resume-button" onClick={resume}>Resume</button>}
  </div>;
}
