import { isBoardSize, SUPPORTED_SIZES, type BoardSize } from "../constants";

interface GameControlsProps {
  readonly size: BoardSize;
  readonly onSizeChange: (size: BoardSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function GameControls({ size, onSizeChange, onNewGame, onRestart }: GameControlsProps) {
  return (
    <div className="game-controls">
      <label htmlFor="grid-size">Grid size</label>
      <select id="grid-size" value={size} onChange={(event) => {
        const nextSize = Number(event.currentTarget.value);
        if (isBoardSize(nextSize)) onSizeChange(nextSize);
      }}>
        {SUPPORTED_SIZES.map((value) => <option key={value} value={value}>{value}x{value}</option>)}
      </select>
      <button type="button" onClick={onNewGame}>New Game</button>
      <button type="button" onClick={onRestart}>Restart</button>
    </div>
  );
}
