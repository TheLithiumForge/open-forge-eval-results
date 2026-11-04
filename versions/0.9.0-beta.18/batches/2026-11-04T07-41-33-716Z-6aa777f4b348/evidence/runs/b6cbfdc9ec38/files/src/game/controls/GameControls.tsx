import { isSide, SIDES } from '../boardCode.ts';
import type { Side } from '../boardCode.ts';
import './GameControls.css';

export interface GameControlsProps {
  readonly size: Side;
  readonly onSize: (size: Side) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function GameControls({ size, onSize, onNewGame, onRestart }: GameControlsProps) {
  return (
    <div className="game-controls">
      <div className="size-control"><label htmlFor="grid-size">Grid size</label>
        <select id="grid-size" value={size} onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (isSide(next)) onSize(next);
        }}>
          {SIDES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </div>
      <button type="button" className="new-game" onClick={onNewGame}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
