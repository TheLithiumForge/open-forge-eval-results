import { BOARD_SIZES, type BoardSize } from "../board/sizes.ts";
import "./GameControls.css";

export interface GameControlsProps {
  readonly size: BoardSize;
  readonly moves: number;
  readonly pairs: number;
  readonly totalPairs: number;
  readonly time: string;
  readonly bestMoves: number | null;
  readonly onChangeSize: (size: number) => void;
  readonly onNewGame: () => void;
  readonly onRestart: () => void;
}

export function GameControls({
  size,
  moves,
  pairs,
  totalPairs,
  time,
  bestMoves,
  onChangeSize,
  onNewGame,
  onRestart,
}: GameControlsProps) {
  return (
    <section className="game-controls" aria-label="Game controls">
      <div className="deal-controls">
        <label className="size-control" htmlFor="grid-size">
          <span>Grid size</span>
          <select
            id="grid-size"
            onChange={(event) => onChangeSize(Number(event.currentTarget.value))}
            value={size}
          >
            {BOARD_SIZES.map((boardSize) => (
              <option key={boardSize} value={boardSize}>{`${boardSize}x${boardSize}`}</option>
            ))}
          </select>
        </label>
        <button onClick={onNewGame} type="button">New Game</button>
        <button onClick={onRestart} type="button">Restart</button>
      </div>
      <div className="score-line">
        <span>Moves: {moves}</span>
        <span>Pairs: {pairs}/{totalPairs}</span>
        <span>Time: {time}</span>
        <span>Best: {bestMoves ?? "none"}</span>
      </div>
    </section>
  );
}
