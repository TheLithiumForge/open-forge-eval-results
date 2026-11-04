import { GRID_SIZES, type GridSize } from '../deal.ts';
import './GameControls.css';

type Props = Readonly<{
  size: GridSize;
  paused: boolean;
  onSizeChange: (size: GridSize) => void;
  onNewGame: () => void;
  onRestart: () => void;
  onResume: () => void;
}>;

export function GameControls({ size, paused, onSizeChange, onNewGame, onRestart, onResume }: Props) {
  return (
    <div className="game-controls">
      <div className="size-control">
        <label htmlFor="grid-size-select">Grid size</label>
        <select id="grid-size-select" value={size} onChange={(event) => {
          const chosen = GRID_SIZES.find((side) => side === Number(event.target.value));
          if (chosen !== undefined) onSizeChange(chosen);
        }}>
          {GRID_SIZES.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </div>
      <button type="button" onClick={onNewGame}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
      {paused ? <button type="button" onClick={onResume}>Resume</button> : null}
    </div>
  );
}
