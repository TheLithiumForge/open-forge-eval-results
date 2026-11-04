import { BOARD_SIZES } from "../constants.js";

interface DealControlsProps {
  readonly size: number;
  readonly onSizeChange: (size: number) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function DealControls({ size, onSizeChange, onNewGame, onRestart }: DealControlsProps) {
  return (
    <div className="deal-controls" role="group" aria-label="Game controls">
      <label className="size-control">
        <span>Grid size</span>
        <select value={size} onChange={(event) => onSizeChange(Number(event.currentTarget.value))}>
          {BOARD_SIZES.map((side) => (
            <option key={side} value={side}>{side}x{side}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onNewGame}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
