import { SUPPORTED_SIZES } from "../board.ts";
import type { GridSize } from "../types.ts";
import "./gameControls.css";

export type GameControlsProps = Readonly<{
  size: GridSize;
  onSizeChange: (size: GridSize) => void;
  onNewGame: () => void;
  onRestart: () => void;
}>;

export function GameControls(props: GameControlsProps) {
  return (
    <section className="game-controls" aria-label="Game controls">
      <div className="size-control">
        <label htmlFor="grid-size">Grid size</label>
        <select id="grid-size" value={props.size} onChange={(event) => {
          const chosen = SUPPORTED_SIZES.find((value) => value === Number(event.currentTarget.value));
          if (chosen !== undefined) props.onSizeChange(chosen);
        }}>
          {SUPPORTED_SIZES.map((value) => <option key={value} value={value}>{value}x{value}</option>)}
        </select>
      </div>
      <div className="deal-buttons">
        <button type="button" className="primary-button" onClick={props.onNewGame}>New Game</button>
        <button type="button" onClick={props.onRestart}>Restart</button>
      </div>
    </section>
  );
}
