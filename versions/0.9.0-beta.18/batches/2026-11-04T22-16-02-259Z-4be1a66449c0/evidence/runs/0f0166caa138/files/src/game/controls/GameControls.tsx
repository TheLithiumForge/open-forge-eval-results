import { isBoardSize } from "../boardCode.ts";
import { BOARD_SIZES, type BoardSize } from "../types.ts";
import "./controls.css";

type Props = {
  readonly size: BoardSize;
  readonly moves: number;
  readonly pairs: number;
  readonly totalPairs: number;
  readonly time: string;
  readonly best: number | undefined;
  readonly onSizeChange: (size: BoardSize) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
};

export function GameControls(props: Props) {
  return (
    <section className="game-controls" aria-label="Game controls">
      <div className="deal-actions">
        <label htmlFor="grid-size">Grid size</label>
        <select
          id="grid-size"
          value={props.size}
          onChange={(event) => {
            const size = Number(event.currentTarget.value);
            if (isBoardSize(size)) props.onSizeChange(size);
          }}
        >
          {BOARD_SIZES.map((size) => <option key={size} value={size}>{size}x{size}</option>)}
        </select>
        <button type="button" onClick={props.onNewGame}>New Game</button>
        <button type="button" onClick={props.onRestart}>Restart</button>
      </div>
      <ul className="game-stats" aria-label="Game statistics">
        <li>Moves: {props.moves}</li>
        <li>Pairs: {props.pairs}/{props.totalPairs}</li>
        <li>Time: {props.time}</li>
        <li>Best: {props.best === undefined ? "none" : props.best}</li>
      </ul>
    </section>
  );
}
