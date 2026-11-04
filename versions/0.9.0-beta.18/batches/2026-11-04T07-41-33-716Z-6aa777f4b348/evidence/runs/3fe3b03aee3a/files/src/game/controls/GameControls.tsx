import { supportedSizes, type BoardSize } from "../types.ts";
import "./game-controls.css";

export type GameControlsProps = Readonly<{
  size: BoardSize;
  paused: boolean;
  onSizeChange(size: BoardSize): void;
  onNewGame(): void;
  onRestart(): void;
  onResume(): void;
}>;

export function GameControls({ size, paused, onSizeChange, onNewGame, onRestart, onResume }: GameControlsProps) {
  function chooseSize(value: string): void {
    const selected = supportedSizes.find((candidate) => candidate === Number(value));
    if (selected !== undefined) onSizeChange(selected);
  }

  return (
    <div className="deal-controls">
      <div className="size-control">
        <label htmlFor="grid-size">Grid size</label>
        <select id="grid-size" value={size} onChange={(event) => chooseSize(event.currentTarget.value)}>
          {supportedSizes.map((side) => <option key={side} value={side}>{side}x{side}</option>)}
        </select>
      </div>
      <div className="start-controls">
        <button type="button" onClick={onNewGame}>New Game</button>
        <button type="button" onClick={onRestart}>Restart</button>
        {paused && <button type="button" onClick={onResume}>Resume</button>}
      </div>
    </div>
  );
}
