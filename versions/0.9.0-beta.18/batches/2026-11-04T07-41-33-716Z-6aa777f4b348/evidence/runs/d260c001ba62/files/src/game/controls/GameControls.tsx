import { isSize, SIZES } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import './Controls.css';

interface GameControlsProps { size: Size; onSize: (size: Size) => void; onNew: () => void; onRestart: () => void }

export function GameControls({ size, onSize, onNew, onRestart }: GameControlsProps) {
  return <div className="game-controls">
    <div className="size-control"><label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={event => { const value = Number(event.target.value); if (isSize(value)) onSize(value); }}>
        {SIZES.map(side => <option key={side} value={side}>{side}x{side}</option>)}
      </select>
    </div>
    <button type="button" className="new-game" onClick={onNew}>New Game <span aria-hidden="true">↗</span></button>
    <button type="button" onClick={onRestart}>Restart <span aria-hidden="true">↻</span></button>
  </div>;
}
